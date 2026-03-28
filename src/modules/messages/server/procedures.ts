import { Buffer } from "node:buffer";

import { z } from "zod";

import { AGENT_PROMPT_VERSION } from "@/constants";
import { getCodeAgentPresetById } from "@/constants/agent-code";
import {
  REFERENCE_IMAGE_BASE64_MAX_LENGTH,
  REFERENCE_IMAGE_MAX_BYTES,
} from "@/constants/vision-upload";
import { AppError, ERROR_CODES, toTRPCError } from "@/lib/errors";
import { dispatchCodeAgentRun } from "@/lib/inngest-dispatch";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getMaxActiveRunsPerUser } from "@/lib/run-policy";
import { expireStaleRunsForUser } from "@/lib/runs";
import { consumeCredits } from "@/lib/usage";
import { writeAuditLog } from "@/lib/audit";
import { ensureHostedProjectEnvironment } from "@/lib/hosted/provision";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const messagesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "projectId is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.appUser!.id,
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
        include: {
          fragment: true,
        },
      });

      return messages;
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10_000, { message: "Value is too long" }),
        projectId: z.string().min(1, { message: "projectId is required" }),
        runMode: z.enum(["debug"]).optional(),
        visualTarget: z
          .object({
            path: z.string().min(1),
            selector: z.string().optional(),
          })
          .optional(),
        /** UI preset id from CODE_AGENT_PRESETS; omit = server default from env */
        codeAgentPresetId: z.string().min(1).optional(),
        /** Optional UI screenshot — described via vision API then injected into agent prompt */
        referenceImage: z
          .object({
            mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
            base64: z
              .string()
              .min(1)
              .max(REFERENCE_IMAGE_BASE64_MAX_LENGTH),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await expireStaleRunsForUser(ctx.appUser!.id, input.projectId);

      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.appUser!.id,
        },
      });

      if (!existingProject) {
        throw toTRPCError(
          new AppError(ERROR_CODES.PROJECT_NOT_FOUND, "Project not found")
        );
      }

      try {
        await consumeCredits();
      } catch (error) {
        log({
          level: "warn",
          message: "messages.create consumeCredits failed",
          requestId: ctx.requestId,
          userId: ctx.appUser!.id,
          projectId: input.projectId,
          code:
            error instanceof AppError
              ? error.code
              : ERROR_CODES.USAGE_CONFIGURATION_ERROR,
          error,
        });
        throw toTRPCError(error);
      }

      const activeRun = await prisma.jobRun.findFirst({
        where: {
          projectId: existingProject.id,
          userId: ctx.appUser!.id,
          status: {
            in: ["PENDING", "RUNNING"],
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (activeRun) {
        throw toTRPCError(
          new AppError(
            ERROR_CODES.RUN_ALREADY_ACTIVE,
            "A generation is already running for this project. Please wait or cancel it first."
          )
        );
      }

      const activeRunsForUser = await prisma.jobRun.count({
        where: {
          userId: ctx.appUser!.id,
          status: { in: ["PENDING", "RUNNING"] },
        },
      });
      if (activeRunsForUser >= getMaxActiveRunsPerUser()) {
        throw toTRPCError(
          new AppError(
            ERROR_CODES.RUN_ALREADY_ACTIVE,
            "Global active run limit reached. Please wait for current runs to finish."
          )
        );
      }

      const recentSameInputRun = await prisma.jobRun.findFirst({
        where: {
          projectId: existingProject.id,
          userId: ctx.appUser!.id,
          input: input.value,
          createdAt: {
            gt: new Date(Date.now() - 90_000),
          },
          status: {
            in: ["PENDING", "RUNNING", "SUCCEEDED"],
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (input.referenceImage) {
        let raw: Buffer;
        try {
          raw = Buffer.from(input.referenceImage.base64, "base64");
        } catch {
          throw toTRPCError(
            new AppError(
              ERROR_CODES.USAGE_CONFIGURATION_ERROR,
              "Invalid reference image encoding.",
            ),
          );
        }
        if (raw.length > REFERENCE_IMAGE_MAX_BYTES) {
          throw toTRPCError(
            new AppError(
              ERROR_CODES.USAGE_CONFIGURATION_ERROR,
              `Screenshot too large. Max ${REFERENCE_IMAGE_MAX_BYTES} bytes after decode.`,
            ),
          );
        }
      }

      if (recentSameInputRun) {
        const existingMessage = await prisma.message.findFirst({
          where: {
            projectId: existingProject.id,
            role: "USER",
            content: input.value,
          },
          orderBy: { createdAt: "desc" },
        });
        if (existingMessage) {
          return existingMessage;
        }
      }

      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.referenceImage
            ? `${input.value}\n\n_(UI screenshot attached for this run.)_`
            : input.value,
          role: "USER",
          type: "RESULT",
          runStatus: "PENDING",
        },
      });

      const createdRun = await prisma.jobRun.create({
        data: {
          projectId: existingProject.id,
          userId: ctx.appUser!.id,
          input: input.value,
          status: "PENDING",
          promptVersion: AGENT_PROMPT_VERSION,
          messages: {
            connect: {
              id: createdMessage.id,
            },
          },
        },
      });

      void ensureHostedProjectEnvironment(existingProject.id).catch(() => {});

      await prisma.message.update({
        where: { id: createdMessage.id },
        data: { runId: createdRun.id },
      });

      if (input.referenceImage) {
        await prisma.jobRun.update({
          where: { id: createdRun.id },
          data: {
            inputContext: {
              visual: {
                mimeType: input.referenceImage.mimeType,
                base64: input.referenceImage.base64,
              },
            },
          },
        });
      }

      const preset = input.codeAgentPresetId
        ? getCodeAgentPresetById(input.codeAgentPresetId)
        : undefined;

      try {
        await dispatchCodeAgentRun({
          value: input.value,
          projectId: existingProject.id,
          runId: createdRun.id,
          userId: ctx.appUser!.id,
          requestId: ctx.requestId,
          runMode: input.runMode,
          visualTarget: input.visualTarget,
          ...(preset
            ? { agentProvider: preset.provider, agentModel: preset.model }
            : {}),
        });
      } catch (error) {
        await prisma.jobRun.update({
          where: { id: createdRun.id },
          data: {
            status: "FAILED",
            errorCode: ERROR_CODES.INNGEST_DISPATCH_FAILED,
            errorMessage: "Dispatch failed before execution",
            finishedAt: new Date(),
          },
        });
        await prisma.message.update({
          where: { id: createdMessage.id },
          data: {
            runStatus: "FAILED",
          },
        });
        log({
          level: "error",
          message: "Failed to dispatch Inngest event",
          requestId: ctx.requestId,
          userId: ctx.appUser!.id,
          projectId: existingProject.id,
          code: ERROR_CODES.INNGEST_DISPATCH_FAILED,
          error,
        });
        throw toTRPCError(
          new AppError(
            ERROR_CODES.INNGEST_DISPATCH_FAILED,
            error instanceof Error ? error.message : "AI job dispatch failed. Please try again.",
            error,
          ),
        );
      }

      await writeAuditLog({
        actorId: ctx.appUser!.id,
        action: "message.created",
        resourceId: createdMessage.id,
        metadata: { runId: createdRun.id, projectId: existingProject.id },
      });

      return createdMessage;
    }),
});
