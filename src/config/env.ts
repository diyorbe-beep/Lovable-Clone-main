import { loadEnvConfig } from "@next/env";
import { z } from "zod";

loadEnvConfig(process.cwd());

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "Clerk publishable key is required"),
  CLERK_SECRET_KEY: z.string().min(1, "Clerk secret key is required"),
  NEXT_PUBLIC_CLERK_BILLING_ENABLED: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_DEV: z.string().optional(),
  E2B_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PRO_PLAN_ID: z.string().optional(),
  CLERK_PRO_PLAN_ID: z.string().optional(),
  FREE_POINTS_LIMIT: z.coerce.number().int().positive().optional(),
  PRO_POINTS_LIMIT: z.coerce.number().int().positive().optional(),
  GENERATION_COST: z.coerce.number().int().positive().optional(),
  USAGE_WINDOW_DAYS: z.coerce.number().int().positive().optional(),
  MAX_ACTIVE_RUNS_PER_USER: z.coerce.number().int().positive().max(10).optional(),
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
