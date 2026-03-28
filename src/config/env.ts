import { loadEnvConfig } from "@next/env";
import { z } from "zod";

loadEnvConfig(process.cwd());

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "Clerk publishable key is required"),
  CLERK_SECRET_KEY: z.string().min(1, "Clerk secret key is required"),
  /** Clerk Dashboard → Webhooks → Signing secret (verify user.created / user.updated / user.deleted) */
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_BILLING_ENABLED: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_DEV: z.string().optional(),
  E2B_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PRO_PLAN_ID: z.string().optional(),
  CLERK_PRO_PLAN_ID: z.string().optional(),
  FREE_POINTS_LIMIT: z.coerce.number().int().positive().optional(),
  PRO_POINTS_LIMIT: z.coerce.number().int().positive().optional(),
  GENERATION_COST: z.coerce.number().int().positive().optional(),
  USAGE_WINDOW_DAYS: z.coerce.number().int().positive().optional(),
  MAX_ACTIVE_RUNS_PER_USER: z.coerce.number().int().positive().max(10).optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  /** Min 32 chars; required to store GitHub OAuth tokens */
  INTEGRATION_ENCRYPTION_KEY: z.string().min(32).optional(),
  AGENT_GEMINI_MODEL: z.string().min(1).optional(),
  /** Force code-agent LLM provider (otherwise inferred from API keys) */
  CODE_AGENT_PROVIDER: z.enum(["gemini", "openai", "anthropic"]).optional(),
  /** Default model id for the selected provider (overrides AGENT_GEMINI_MODEL when set) */
  CODE_AGENT_MODEL: z.string().min(1).optional(),
  /** Vercel → Project → Settings → Git → Deploy Hooks */
  VERCEL_DEPLOY_HOOK_URL: z.string().url().optional(),
  /** List deployments / resolve persistent preview (optional) */
  VERCEL_TOKEN: z.string().min(1).optional(),
  VERCEL_PROJECT_ID: z.string().min(1).optional(),
  VERCEL_TEAM_ID: z.string().min(1).optional(),
  /** Stable production URL for previews when sandbox expires */
  VERCEL_PRODUCTION_URL: z.string().url().optional(),
  /** Optional: static / CDN preview URL used when sandbox URL expires */
  HOSTED_FALLBACK_PREVIEW_URL: z.string().url().optional(),
  /** Tenant UI / anon key (optional; same project as DATABASE_URL) */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid server environment configuration: ${details}`);
}

export const env = parsed.data;

export function getRequiredInngestKeys() {
  if (!env.INNGEST_EVENT_KEY) {
    throw new Error("INNGEST_EVENT_KEY is missing");
  }

  if (!env.INNGEST_SIGNING_KEY && !env.INNGEST_DEV) {
    throw new Error("INNGEST_SIGNING_KEY is missing (or set INNGEST_DEV for local mode)");
  }

  return {
    eventKey: env.INNGEST_EVENT_KEY,
    signingKey: env.INNGEST_SIGNING_KEY,
  };
}
