"use client";

import { RunStatus } from "@/generated/prisma";
import { useEffect, useState } from "react";

export interface RunStreamPayload {
  id: string;
  status: RunStatus;
  errorMessage?: string | null;
}

export function useRunStatusStream(projectId: string) {
  const [latestRun, setLatestRun] = useState<RunStreamPayload | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    let source: EventSource | null = null;
    let reconnectTimer: number | undefined;

    const closeSource = () => {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      source?.close();
      source = null;
    };

    const connect = () => {
      closeSource();
      if (cancelled) return;

      source = new EventSource(`/api/runs/${projectId}/events`);

      const onRun = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as RunStreamPayload | null;
          setLatestRun(payload);
        } catch {
          // ignore malformed events
        }
      };

      source.addEventListener("run", onRun);
      source.addEventListener("error", () => {
        closeSource();
        if (!cancelled) {
          reconnectTimer = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      });
    };

    connect();

    return () => {
      cancelled = true;
      closeSource();
    };
  }, [projectId]);

  return latestRun;
}
