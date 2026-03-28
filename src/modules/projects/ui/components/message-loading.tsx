import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { RunProgressJson } from "@/lib/run-progress";
import { cn } from "@/lib/utils";

const PHASES: { key: RunProgressJson["phase"]; label: string }[] = [
  { key: "intent", label: "Understand" },
  { key: "plan", label: "Plan" },
  { key: "architect", label: "Architect" },
  { key: "build", label: "Build" },
  { key: "review", label: "Review" },
  { key: "fix", label: "Fix" },
  { key: "test", label: "Test" },
  { key: "finalize", label: "Ship" },
];

function TypeStream({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
  }, [text]);
  useEffect(() => {
    if (shown >= text.length) return;
    const t = window.setTimeout(() => setShown((s) => s + 3), 12);
    return () => window.clearTimeout(t);
  }, [shown, text]);
  const slice = text.slice(0, shown);
  return (
    <p className="text-muted-foreground max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
      {slice}
      {shown < text.length ? (
        <span className="bg-primary/80 ml-0.5 inline-block h-3 w-1.5 animate-pulse align-middle" />
      ) : null}
    </p>
  );
}

interface MessageLoadingProps {
  progress?: RunProgressJson | null;
}

const MessageLoading = ({ progress }: MessageLoadingProps) => {
  const phaseIndex = useMemo(() => {
    if (!progress?.phase) return 0;
    const i = PHASES.findIndex((p) => p.key === progress.phase);
    return i >= 0 ? i : 0;
  }, [progress?.phase]);

  return (
    <div className="flex flex-col group px-2 pb-4">
      <div className="flex items-center gap-2 pl-2 mb-2">
        <Image
          src="/logo.svg"
          alt="lovable-clone"
          height={18}
          width={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Lovable Clone</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {progress?.pct != null ? `${progress.pct}%` : ""}
        </span>
      </div>
      <div className="pl-8.5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PHASES.map((p, i) => (
            <span
              key={p.key}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                i < phaseIndex &&
                  "border-primary/50 bg-primary/10 text-foreground",
                i === phaseIndex &&
                  "border-primary bg-primary/15 text-foreground",
                i > phaseIndex && "border-muted text-muted-foreground",
              )}
            >
              {p.label}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-foreground text-sm font-medium">
            {progress?.label ?? "Working on your app…"}
          </p>
          {progress?.detail ? (
            <p className="text-muted-foreground text-xs">{progress.detail}</p>
          ) : null}
          {progress?.changedPaths?.length ? (
            <p className="text-muted-foreground font-mono text-[10px] line-clamp-2">
              {progress.changedPaths.slice(0, 6).join(" · ")}
            </p>
          ) : null}
        </div>
        {progress?.streamText ? (
          <TypeStream text={progress.streamText} />
        ) : (
          <div className="bg-muted/40 h-2 w-full max-w-sm overflow-hidden rounded-full">
            <div
              className="bg-primary h-full animate-pulse transition-[width] duration-500"
              style={{
                width: `${Math.min(100, Math.max(8, progress?.pct ?? 30))}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export { MessageLoading };
