import { TRPCError } from "@trpc/server";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";

import { AppError, ERROR_CODES, toTRPCError } from "@/lib/errors";
import { dispatchCodeAgentRun } from "@/lib/inngest-dispatch";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getMaxActiveRunsPerUser } from "@/lib/run-policy";
import { consumeCredits } from "@/lib/usage";
import { writeAuditLog } from "@/lib/audit";
import { ensureDefaultWorkspace } from "@/lib/workspace";
import { expireStaleRunsForUser } from "@/lib/runs";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "id is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: {
        userId: ctx.auth.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return projects;
  }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10_000, { message: "Value is too long" }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await expireStaleRunsForUser(ctx.auth.userId);

      const activeRunsCount = await prisma.jobRun.count({
        where: {
          userId: ctx.auth.userId,
          status: { in: ["PENDING", "RUNNING"] },
        },
      });

      if (activeRunsCount >= getMaxActiveRunsPerUser()) {
        throw toTRPCError(
          new AppError(
            ERROR_CODES.RUN_ALREADY_ACTIVE,
            "Active run limit reached. Finish or cancel current generation before starting a new one."
          )
        );
      }

      try {
        await consumeCredits();
      } catch (error) {
        log({
          level: "warn",
          message: "projects.create consumeCredits failed",
          requestId: ctx.requestId,
          userId: ctx.auth.userId,
          code:
            error instanceof AppError
              ? error.code
              : ERROR_CODES.USAGE_CONFIGURATION_ERROR,
          error,
        });
        throw toTRPCError(error);
      }

      const workspace = await ensureDefaultWorkspace(ctx.auth.userId);

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          workspaceId: workspace.id,
          name: generateSlug(2, { format: "kebab" }),
        },
      });

      const createdRun = await prisma.jobRun.create({
        data: {
          projectId: createdProject.id,
          userId: ctx.auth.userId,
          input: input.value,
          status: "PENDING",
          promptVersion: "v1",
        },
      });

      await prisma.message.create({
        data: {
          projectId: createdProject.id,
          content: input.value,
          role: "USER",
          type: "RESULT",
          runStatus: "PENDING",
          runId: createdRun.id,
        },
      });

      try {
        await dispatchCodeAgentRun({
          value: input.value,
          projectId: createdProject.id,
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
        await prisma.message.updateMany({
          where: {
            runId: createdRun.id,
            role: "USER",
          },
          data: {
            runStatus: "FAILED",
          },
        });
        log({
          level: "error",
          message: "Failed to dispatch Inngest event",
          requestId: ctx.requestId,
          userId: ctx.auth.userId,
          projectId: createdProject.id,
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
        action: "project.created",
        resourceId: createdProject.id,
        metadata: { runId: createdRun.id },
      });

      return createdProject;
    }),
});
