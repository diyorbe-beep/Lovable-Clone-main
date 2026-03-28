"use client";

import { useQuery } from "@tanstack/react-query";

import { RunStatus } from "@/generated/prisma";
import { useRunStatusStream } from "@/hooks/use-run-status-stream";
import { useTRPC } from "@/trpc/client";

export type EffectiveProjectRun = {
  id: string;
  status: RunStatus;
  errorMessage?: string | null;
  progress?: unknown;
} | null;

function normalizeRun(raw: unknown): EffectiveProjectRun {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.status !== "string") return null;
  return {
    id: r.id,
    status: r.status as RunStatus,
    errorMessage:
      typeof r.errorMessage === "string" || r.errorMessage === null
        ? (r.errorMessage as string | null)
        : null,
    progress: r.progress,
  };
}

/**
 * Merges SSE updates with tRPC so UI stays correct if EventSource fails or reconnects.
 */
export function useEffectiveProjectRun(projectId: string): EffectiveProjectRun {
  const trpc = useTRPC();
  const { data: latestRun } = useQuery(
    trpc.jobs.latestForProject.queryOptions(
      { projectId },
      {
        refetchOnWindowFocus: true,
        staleTime: 600,
        refetchInterval: (query) => {
          const d = query.state.data as { status?: string } | undefined;
          const s = d?.status;
          return s === "PENDING" || s === "RUNNING" ? 750 : false;
        },
      },
    ),
  );

  const streamRun = useRunStatusStream(projectId);
  return normalizeRun(streamRun) ?? normalizeRun(latestRun) ?? null;
}
