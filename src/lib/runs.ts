import { ERROR_CODES } from "./errors";
import prisma from "./prisma";
import { RunStatus } from "@/generated/prisma";

/** PENDING: worker ishga tushmagan yoki navbat ololmagan */
const STALE_PENDING_MS = 3 * 60 * 1000;

/** RUNNING: ~sandbox (2m) + AI (3m) + marja — undan oshsa qotgan deb hisoblanadi */
const STALE_RUNNING_MS = 8 * 60 * 1000;

const STALE_MSG_PENDING =
  "Job was not picked up in time. Keep `npm run dev:all` running and check Inngest is connected to this app.";

const STALE_MSG_RUNNING =
  "Generation took too long (sandbox or AI step). Check E2B_API_KEY and Gemini keys, then Retry.";

export async function expireStaleRunsForUser(userId: string, projectId?: string) {
  const now = Date.now();
  const pendingCutoff = new Date(now - STALE_PENDING_MS);
  const runningCutoff = new Date(now - STALE_RUNNING_MS);

  const scoped = projectId ? { userId, projectId } : { userId };

  const pendingStale = await prisma.jobRun.findMany({
    where: {
      ...scoped,
      status: RunStatus.PENDING,
      startedAt: null,
      createdAt: { lt: pendingCutoff },
    },
    select: { id: true },
  });

  const runningStale = await prisma.jobRun.findMany({
    where: {
      ...scoped,
      status: RunStatus.RUNNING,
      OR: [
        { startedAt: { lt: runningCutoff } },
        { startedAt: null, createdAt: { lt: runningCutoff } },
      ],
    },
    select: { id: true },
  });

  const pendingIds = pendingStale.map((r) => r.id);
  const runningIds = runningStale.map((r) => r.id);
  const allIds = [...new Set([...pendingIds, ...runningIds])];

  if (allIds.length === 0) return 0;

  if (pendingIds.length > 0) {
    await prisma.jobRun.updateMany({
      where: { id: { in: pendingIds } },
      data: {
        status: "FAILED",
        errorCode: ERROR_CODES.INNGEST_DISPATCH_FAILED,
        errorMessage: STALE_MSG_PENDING,
        finishedAt: new Date(),
      },
    });
  }

  if (runningIds.length > 0) {
    await prisma.jobRun.updateMany({
      where: { id: { in: runningIds } },
      data: {
        status: "FAILED",
        errorCode: ERROR_CODES.RUN_TIMEOUT,
        errorMessage: STALE_MSG_RUNNING,
        finishedAt: new Date(),
      },
    });
  }

  await prisma.message.updateMany({
    where: {
      runId: { in: allIds },
      role: "USER",
    },
    data: {
      runStatus: "FAILED",
    },
  });

  return allIds.length;
}
