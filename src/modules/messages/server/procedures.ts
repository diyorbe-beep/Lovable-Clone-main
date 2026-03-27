import { z } from "zod";

import { AppError, ERROR_CODES, toTRPCError } from "@/lib/errors";
import { dispatchCodeAgentRun } from "@/lib/inngest-dispatch";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getMaxActiveRunsPerUser } from "@/lib/run-policy";
import { expireStaleRunsForUser } from "@/lib/runs";
import { consumeCredits } from "@/lib/usage";
import { writeAuditLog } from "@/lib/audit";
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
            userId: ctx.auth.userId,
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      await expireStaleRunsForUser(ctx.auth.userId, input.projectId);

      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.auth.userId,
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
          userId: ctx.auth.userId,
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
          userId: ctx.auth.userId,
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
          userId: ctx.auth.userId,
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
          userId: ctx.auth.userId,
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
          content: input.value,
          role: "USER",
          type: "RESULT",
          runStatus: "PENDING",
        },
      });

      const createdRun = await prisma.jobRun.create({
        data: {
          projectId: existingProject.id,
          userId: ctx.auth.userId,
          input: input.value,
          status: "PENDING",
          promptVersion: "v1",
          messages: {
            connect: {
              id: createdMessage.id,
            },
          },
        },
      });

      await prisma.message.update({
        where: { id: createdMessage.id },
        data: { runId: createdRun.id },
      });

      try {
        await dispatchCodeAgentRun({
          value: input.value,
          projectId: existingProject.id,
          runId: createdRun.id,
          userId: ctx.auth.userId,
          requestId: ctx.requestId,
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
          userId: ctx.auth.userId,
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
        actorId: ctx.auth.userId,
        action: "message.created",
        resourceId: createdMessage.id,
        metadata: { runId: createdRun.id, projectId: existingProject.id },
      });

      return createdMessage;
    }),
});
