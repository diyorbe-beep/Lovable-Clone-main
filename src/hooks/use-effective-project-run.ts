"use client";

import { useQuery } from "@tanstack/react-query";

import { useRunStatusStream } from "@/hooks/use-run-status-stream";
import { useTRPC } from "@/trpc/client";

/**
 * Merges SSE updates with tRPC so UI stays correct if EventSource fails or reconnects.
 */
export function useEffectiveProjectRun(projectId: string) {
  const trpc = useTRPC();
  const { data: latestRun } = useQuery(
    trpc.jobs.latestForProject.queryOptions(
      { projectId },
      {
        refetchOnWindowFocus: true,
        staleTime: 1500,
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          return status === "PENDING" || status === "RUNNING" ? 2000 : false;
        },
      },
    ),
  );

  const streamRun = useRunStatusStream(projectId);
  return streamRun ?? latestRun ?? null;
}
