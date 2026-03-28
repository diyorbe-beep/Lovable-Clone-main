import { RunStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";

interface RunStatusBannerProps {
  runId?: string;
  status?: RunStatus;
  errorMessage?: string | null;
  /** Live step label from JobRun.progress (streaming UX) */
  progressLabel?: string | null;
  progressDetail?: string | null;
  onRetry?: (runId: string) => void;
  onCancel?: (runId: string) => void;
  busy?: boolean;
}

const textByStatus: Record<RunStatus, string> = {
  PENDING: "Queued...",
  RUNNING: "Generating...",
  SUCCEEDED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const RunStatusBanner = ({
  runId,
  status,
  errorMessage,
  progressLabel,
  progressDetail,
  onRetry,
  onCancel,
  busy,
}: RunStatusBannerProps) => {
  if (!status || status === "SUCCEEDED") {
    return null;
  }

  const isError = status === "FAILED" || status === "CANCELLED";
  return (
    <div
      className={`mx-2 mb-2 rounded-md border px-3 py-2 text-xs ${
        isError ? "border-red-400 text-red-700 dark:text-red-400" : "border-border text-muted-foreground"
      }`}
    >
      <span className="font-medium text-foreground">{textByStatus[status]}</span>
      {(status === "PENDING" || status === "RUNNING") &&
      (progressLabel || progressDetail) ? (
        <span className="mt-1 block text-muted-foreground">
          {progressLabel ? `${progressLabel}` : ""}
          {progressDetail ? ` — ${progressDetail}` : ""}
        </span>
      ) : null}
      {errorMessage ? `: ${errorMessage}` : ""}
      <div className="mt-2 flex gap-2">
        {(status === "FAILED" || status === "CANCELLED") && runId && onRetry && (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => onRetry(runId)}
            disabled={busy}
          >
            Retry
          </Button>
        )}
        {(status === "PENDING" || status === "RUNNING") && runId && onCancel && (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => onCancel(runId)}
            disabled={busy}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export { RunStatusBanner };
