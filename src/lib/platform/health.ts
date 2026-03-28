/**
 * Server-side checklist for "Lovable-class" experience (no secrets exposed).
 */
export type PlatformHealth = {
  agentReady: boolean;
  cloudPreviewReady: boolean;
  shipReady: boolean;
  /** Human-readable keys still worth setting */
  missingAgent: string[];
  missingCloud: string[];
  missingShip: string[];
};

export function getPlatformHealth(): PlatformHealth {
  const missingAgent: string[] = [];
  if (!process.env.E2B_API_KEY?.trim()) {
    missingAgent.push("E2B_API_KEY");
  }
  const hasLlm =
    Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) ||
    Boolean(process.env.GOOGLE_API_KEY?.trim()) ||
    Boolean(process.env.OPENAI_API_KEY?.trim()) ||
    Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  if (!hasLlm) {
    missingAgent.push(
      "One of: GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY",
    );
  }
  const inngestOk = Boolean(
    process.env.INNGEST_EVENT_KEY?.trim() &&
      (process.env.INNGEST_SIGNING_KEY?.trim() ||
        process.env.INNGEST_DEV === "1"),
  );
  if (!inngestOk) {
    missingAgent.push(
      "INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY (or INNGEST_DEV=1)",
    );
  }

  const missingCloud: string[] = [];
  const hasStablePreview = Boolean(
    process.env.VERCEL_PRODUCTION_URL?.trim() ||
      process.env.HOSTED_FALLBACK_PREVIEW_URL?.trim(),
  );
  if (!hasStablePreview) {
    missingCloud.push(
      "VERCEL_PRODUCTION_URL or HOSTED_FALLBACK_PREVIEW_URL (always-on preview)",
    );
  }
  const hasVercelAutomation = Boolean(
    process.env.VERCEL_DEPLOY_HOOK_URL?.trim() ||
      (process.env.VERCEL_TOKEN?.trim() &&
        process.env.VERCEL_PROJECT_ID?.trim()),
  );
  if (!hasVercelAutomation) {
    missingCloud.push(
      "VERCEL_DEPLOY_HOOK_URL or (VERCEL_TOKEN + VERCEL_PROJECT_ID) for auto-deploy",
    );
  }

  const missingShip: string[] = [];
  if (
    !process.env.GITHUB_CLIENT_ID?.trim() ||
    !process.env.GITHUB_CLIENT_SECRET?.trim()
  ) {
    missingShip.push("GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET (Ship without PAT)");
  }
  if (
    process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET &&
    (!process.env.INTEGRATION_ENCRYPTION_KEY ||
      process.env.INTEGRATION_ENCRYPTION_KEY.length < 32)
  ) {
    missingShip.push(
      "INTEGRATION_ENCRYPTION_KEY (32+ chars) to store GitHub OAuth tokens",
    );
  }

  return {
    agentReady: missingAgent.length === 0,
    cloudPreviewReady: missingCloud.length === 0,
    shipReady: missingShip.length === 0,
    missingAgent,
    missingCloud,
    missingShip,
  };
}
