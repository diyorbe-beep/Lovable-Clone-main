-- Live run progress for streaming UX (phase labels, partial paths, stream text)
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "progress" JSONB;
