type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  message: string;
  level?: LogLevel;
  requestId?: string;
  userId?: string | null;
  projectId?: string;
  runId?: string;
  code?: string;
  error?: unknown;
  meta?: Record<string, unknown>;
}

export function log(payload: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level: payload.level ?? "info",
    message: payload.message,
    requestId: payload.requestId,
    userId: payload.userId,
    projectId: payload.projectId,
    runId: payload.runId,
    code: payload.code,
    meta: payload.meta,
    error:
      payload.error instanceof Error
        ? { name: payload.error.name, message: payload.error.message }
        : payload.error,
  };

  if (entry.level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (entry.level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}
