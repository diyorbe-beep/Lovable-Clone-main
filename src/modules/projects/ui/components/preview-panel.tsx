"use client";

import { Loader2Icon } from "lucide-react";

import { Fragment, RunStatus } from "@/generated/prisma";
import { FragmentWeb } from "@/modules/projects/ui/components/fragment-web";

interface PreviewPanelProps {
  activeFragment: Fragment | null;
  runStatus?: RunStatus | null;
  errorMessage?: string | null;
}

export function PreviewPanel({
  activeFragment,
  runStatus,
  errorMessage,
}: PreviewPanelProps) {
  const isGenerating =
    runStatus === "PENDING" || runStatus === "RUNNING";

  if (activeFragment) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <FragmentWeb data={activeFragment} />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Building preview…</p>
          <p>
            The sandbox is starting and your app will load here. This can take
            a minute.
          </p>
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
