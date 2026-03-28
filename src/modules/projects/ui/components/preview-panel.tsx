"use client";

import { Loader2Icon } from "lucide-react";

import { Fragment, RunStatus } from "@/generated/prisma";
import type { RunProgressJson } from "@/lib/run-progress";
import {
  FragmentWeb,
  type VisualPickPayload,
} from "@/modules/projects/ui/components/fragment-web";

interface PreviewPanelProps {
  activeFragment: Fragment | null;
  runStatus?: RunStatus | null;
  errorMessage?: string | null;
  progress?: RunProgressJson | null;
  // eslint-disable-next-line no-unused-vars
  onVisualPick?: (payload: VisualPickPayload) => void;
}

export function PreviewPanel({
  activeFragment,
  runStatus,
  errorMessage,
  progress,
  onVisualPick,
}: PreviewPanelProps) {
  const isGenerating =
    runStatus === "PENDING" || runStatus === "RUNNING";

  if (activeFragment) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {onVisualPick ? (
          <p className="text-muted-foreground shrink-0 border-b bg-muted/30 px-3 py-2 text-center text-[11px] leading-snug md:text-xs">
            <span className="font-medium text-foreground">
              Visual target:
            </span>{" "}
            click an element in the preview that was built with{" "}
            <code className="rounded bg-background px-1 font-mono text-[10px]">
              data-dev-source=&quot;…&quot;
            </code>{" "}
            — the path fills in chat so your next prompt edits that file.
          </p>
        ) : null}
        <FragmentWeb
          data={activeFragment}
          bustKey={progress?.previewRev}
          onVisualPick={onVisualPick}
        />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {progress?.label ?? "Building preview…"}
          </p>
          <p>
            {progress?.detail ??
              "Sandbox is starting; the app will load here when the run finishes."}
          </p>
          {progress?.pct != null ? (
            <p className="text-muted-foreground text-xs tabular-nums">
              {progress.pct}% · {progress.phase}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (runStatus === "FAILED" || runStatus === "CANCELLED") {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        <p className="font-medium text-destructive">Preview unavailable</p>
        <p className="max-w-md">
          {errorMessage || "Generation did not finish. Use Retry in the chat or check that the Inngest worker is running."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No preview yet</p>
      <p className="max-w-md">
        Send a prompt to generate a live demo. Preview appears here when the
        build completes.
      </p>
    </div>
  );
}
