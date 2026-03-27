import { z } from "zod";

import { AppError, ERROR_CODES, toTRPCError } from "@/lib/errors";
import { dispatchCodeAgentRun } from "@/lib/inngest-dispatch";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { expireStaleRunsForUser } from "@/lib/runs";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const jobsRouter = createTRPCRouter({
  health: protectedProcedure.query(async ({ ctx }) => {
    await expireStaleRunsForUser(ctx.auth.userId);

    const staleThreshold = new Date(Date.now() - 8 * 60 * 1000);
    const [runningCount, staleCount, lastRun] = await Promise.all([
      prisma.jobRun.count({
        where: {
          userId: ctx.auth.userId,
          status: { in: ["PENDING", "RUNNING"] },
        },
      }),
      prisma.jobRun.count({
        where: {
          userId: ctx.auth.userId,
          status: { in: ["PENDING", "RUNNING"] },
          createdAt: { lt: staleThreshold },
        },
      }),
      prisma.jobRun.findFirst({
        where: { userId: ctx.auth.userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      ok: staleCount === 0,
      runningCount,
      staleCount,
      lastRunStatus: lastRun?.status ?? null,
      checkedAt: new Date().toISOString(),
    };
  }),
  latestForProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      await expireStaleRunsForUser(ctx.auth.userId, input.projectId);

      const run = await prisma.jobRun.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.auth.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return run;
    }),
  cancel: protectedProcedure
    .input(
      z.object({
        runId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const run = await prisma.jobRun.findFirst({
        where: { id: input.runId, userId: ctx.auth.userId },
      });

      if (!run) {
        throw toTRPCError(new AppError(ERROR_CODES.RUN_NOT_FOUND, "Run not found"));
      }

      if (!["PENDING", "RUNNING"].includes(run.status)) {
        return run;
      }

      const updated = await prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorCode: ERROR_CODES.RUN_CANCELLED,
          errorMessage: "Cancelled by user",
          finishedAt: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          projectId: run.projectId,
          role: "ASSISTANT",
          type: "ERROR",
          content: "Generation cancelled.",
          runStatus: "FAILED",
          runId: run.id,
        },
      });
      await prisma.message.updateMany({
        where: {
          runId: run.id,
          role: "USER",
        },
        data: {
          runStatus: "FAILED",
        },
      });

      return updated;
    }),
  retry: protectedProcedure
    .input(
      z.object({
        runId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const oldRun = await prisma.jobRun.findFirst({
        where: { id: input.runId, userId: ctx.auth.userId },
      });

      if (!oldRun) {
        throw toTRPCError(new AppError(ERROR_CODES.RUN_NOT_FOUND, "Run not found"));
      }

      const activeRun = await prisma.jobRun.findFirst({
        where: {
          projectId: oldRun.projectId,
          userId: ctx.auth.userId,
          status: { in: ["PENDING", "RUNNING"] },
        },
      });

      if (activeRun) {
        throw toTRPCError(
          new AppError(
            ERROR_CODES.RUN_ALREADY_ACTIVE,
            "A generation is already running for this project."
          )
        );
      }

      const newRun = await prisma.jobRun.create({
        data: {
          projectId: oldRun.projectId,
          userId: oldRun.userId,
          input: oldRun.input,
          status: "PENDING",
          promptVersion: oldRun.promptVersion || "v1",
        },
      });

      await prisma.message.create({
        data: {
          projectId: oldRun.projectId,
          role: "USER",
          type: "RESULT",
          content: oldRun.input,
          runStatus: "PENDING",
          runId: newRun.id,
        },
      });

      try {
        await dispatchCodeAgentRun({
          value: oldRun.input,
          projectId: oldRun.projectId,
          runId: newRun.id,
          userId: oldRun.userId,
          requestId: ctx.requestId,
        });
      } catch (error) {
        log({
          level: "error",
          message: "jobs.retry dispatch failed",
          requestId: ctx.requestId,
          userId: ctx.auth.userId,
          projectId: oldRun.projectId,
          runId: newRun.id,
          code: ERROR_CODES.INNGEST_DISPATCH_FAILED,
          error,
        });
        await prisma.jobRun.update({
          where: { id: newRun.id },
          data: {
            status: "FAILED",
            errorCode: ERROR_CODES.INNGEST_DISPATCH_FAILED,
            errorMessage: "Retry dispatch failed",
            finishedAt: new Date(),
          },
        });
      }

      return newRun;
    }),
});
