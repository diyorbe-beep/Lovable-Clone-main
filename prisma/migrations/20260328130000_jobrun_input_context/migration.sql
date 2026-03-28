-- Ephemeral vision / multimodal context for a single JobRun (keeps Inngest payloads small)
ALTER TABLE "JobRun" ADD COLUMN IF NOT EXISTS "inputContext" JSONB;
