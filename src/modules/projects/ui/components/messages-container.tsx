import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { Fragment } from "@/generated/prisma";
import type { EffectiveProjectRun } from "@/hooks/use-effective-project-run";
import type { RunProgressJson } from "@/lib/run-progress";
import { useTRPC } from "@/trpc/client";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { MessageLoading } from "./message-loading";
import { RunStatusBanner } from "./run-status-banner";

interface MessagesContainerProps {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (activeFragment: Fragment | null) => void;
  effectiveRun: EffectiveProjectRun;
  visualPrefillPath?: string | null;
  onVisualPrefillConsumed?: () => void;
}

const MessagesContainer = ({
  activeFragment,
  effectiveRun,
  projectId,
  setActiveFragment,
  visualPrefillPath,
  onVisualPrefillConsumed,
}: MessagesContainerProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const lastHandledTerminalRunIdRef = useRef<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isRunActive =
    effectiveRun?.status === "PENDING" || effectiveRun?.status === "RUNNING";

  const { data: messages } = useQuery(
    trpc.messages.getMany.queryOptions(
      { projectId },
      {
        refetchOnWindowFocus: true,
        staleTime: 2000,
        refetchInterval: isRunActive ? 1100 : false,
      },
    ),
  );

  const cancelRun = useMutation(
    trpc.jobs.cancel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.jobs.latestForProject.queryOptions({ projectId }),
        );
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId }),
        );
      },
    }),
  );
  const retryRun = useMutation(
    trpc.jobs.retry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.jobs.latestForProject.queryOptions({ projectId }),
        );
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId }),
        );
      },
    }),
  );

  useEffect(() => {
    if (!effectiveRun?.id) return;
    const terminal =
      effectiveRun.status === "SUCCEEDED" ||
      effectiveRun.status === "FAILED" ||
      effectiveRun.status === "CANCELLED";
    if (!terminal) return;
    if (lastHandledTerminalRunIdRef.current === effectiveRun.id) return;
    lastHandledTerminalRunIdRef.current = effectiveRun.id;
    void queryClient.invalidateQueries(
      trpc.messages.getMany.queryOptions({ projectId }),
    );
    void queryClient.invalidateQueries(
      trpc.jobs.latestForProject.queryOptions({ projectId }),
    );
  }, [effectiveRun, projectId, queryClient, trpc]);

  useEffect(() => {
    const lastAssistantMessage = messages?.findLast(
      (message) => message.role === "ASSISTANT",
    );

    if (
      lastAssistantMessage?.fragment &&
      lastAssistantMessage.id !== lastAssistantMessageIdRef.current
    ) {
      setActiveFragment(lastAssistantMessage?.fragment);
      lastAssistantMessageIdRef.current = lastAssistantMessage.id;
    }
  }, [messages, setActiveFragment]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, effectiveRun?.progress, effectiveRun?.status]);

  const isLastMessageUser =
    effectiveRun?.status === "PENDING" || effectiveRun?.status === "RUNNING";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pt-2 pr-1">
          {messages?.map((message) => (
            <MessageCard
              key={message.id}
              content={message.content}
              role={message.role}
              fragment={message.fragment}
              createdAt={message.createdAt}
              isActiveFragment={activeFragment?.id === message.fragment?.id}
              onFragmentClick={() => setActiveFragment(message.fragment)}
              type={message.type}
            />
          ))}

          {isLastMessageUser && (
            <MessageLoading
              progress={
                (effectiveRun?.progress as RunProgressJson | null | undefined) ??
                null
              }
            />
          )}
          <RunStatusBanner
            runId={effectiveRun?.id}
            status={effectiveRun?.status}
            errorMessage={effectiveRun?.errorMessage}
            progressLabel={
              (effectiveRun?.progress as RunProgressJson | undefined)?.label
            }
            progressDetail={
              (effectiveRun?.progress as RunProgressJson | undefined)?.detail
            }
            onCancel={(runId) => cancelRun.mutate({ runId })}
            onRetry={(runId) => retryRun.mutate({ runId })}
            busy={cancelRun.isPending || retryRun.isPending}
          />

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="relative p-3 pt-1">
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background pointer-events-none" />
        <MessageForm
          projectId={projectId}
          prefillTargetPath={visualPrefillPath ?? undefined}
          onPrefillTargetConsumed={onVisualPrefillConsumed}
        />
      </div>
    </div>
  );
};

export { MessagesContainer };
