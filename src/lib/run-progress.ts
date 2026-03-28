import prisma from "@/lib/prisma";

export type RunProgressPhase =
  | "intent"
  | "plan"
  | "architect"
  | "build"
  | "review"
  | "fix"
  | "test"
  | "finalize";

export type RunProgressJson = {
  phase: RunProgressPhase;
  label: string;
  detail?: string;
  pct?: number;
  streamText?: string;
  changedPaths?: string[];
  /** Merged file snapshots for optimistic code / preview (size-capped). */
  partialPreview?: Record<string, string>;
  previewSandboxUrl?: string;
  previewRev?: number;
  iteration?: number;
  lastVerifyLog?: string;
};

const MAX_STREAM = 2800;
const MAX_PREVIEW_JSON = 52_000;

export function truncateStreamText(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= MAX_STREAM) return t;
  return `…${t.slice(-MAX_STREAM)}`;
}

function mergePreviewMaps(
  prev: Record<string, string> | undefined,
  incoming: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!incoming || Object.keys(incoming).length === 0) return prev;
  const merged: Record<string, string> = { ...(prev ?? {}), ...incoming };

  let serialized = JSON.stringify(merged);
  while (serialized.length > MAX_PREVIEW_JSON && Object.keys(merged).length > 0) {
    let worst: string | null = null;
    let worstLen = -1;
    for (const [k, v] of Object.entries(merged)) {
      if (v.length > worstLen) {
        worstLen = v.length;
        worst = k;
      }
    }
    if (worst) delete merged[worst];
    serialized = JSON.stringify(merged);
  }

  return Object.keys(merged).length > 0 ? merged : prev;
}

export type RunProgressPatch = Partial<RunProgressJson> & {
  phase?: RunProgressPhase;
  /** When true, bumps `previewRev` so the iframe refreshes. */
  previewRevBump?: boolean;
};

export async function mergeRunProgress(
  runId: string,
  patch: RunProgressPatch,
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ progress: unknown }[]>(
    `SELECT "progress" FROM "JobRun" WHERE "id" = $1`,
    runId,
  );
  const prev = (rows[0]?.progress as RunProgressJson | null) ?? undefined;
  const { previewRevBump, ...rest } = patch;

  const nextPreview = mergePreviewMaps(
    prev?.partialPreview,
    rest.partialPreview,
  );

  let previewRev = prev?.previewRev ?? 0;
  if (previewRevBump) previewRev += 1;
  if (rest.previewRev !== undefined) previewRev = rest.previewRev;

  const next: RunProgressJson = {
    phase: rest.phase ?? prev?.phase ?? "intent",
    label: rest.label ?? prev?.label ?? "Working…",
    detail: rest.detail ?? prev?.detail,
    pct: rest.pct ?? prev?.pct,
    streamText: rest.streamText ?? prev?.streamText,
    changedPaths: rest.changedPaths ?? prev?.changedPaths,
    partialPreview: nextPreview ?? rest.partialPreview ?? prev?.partialPreview,
    previewSandboxUrl: rest.previewSandboxUrl ?? prev?.previewSandboxUrl,
    previewRev,
    iteration: rest.iteration ?? prev?.iteration,
    lastVerifyLog: rest.lastVerifyLog ?? prev?.lastVerifyLog,
  };

  await prisma.$executeRawUnsafe(
    `UPDATE "JobRun" SET "progress" = $1::jsonb WHERE "id" = $2`,
    JSON.stringify(next),
    runId,
  );
}

export async function clearRunProgress(runId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "JobRun" SET "progress" = NULL WHERE "id" = $1`,
    runId,
  );
}
