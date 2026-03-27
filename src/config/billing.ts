/**
 * Clerk Billing plan claim: must match `user:<plan_id>` from the Clerk dashboard.
 * Set `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` (and optionally `CLERK_PRO_PLAN_ID` on server) if your plan id is not `pro`.
 */
export const CLERK_PRO_PLAN_CLAIM =
  process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID ||
  process.env.CLERK_PRO_PLAN_ID ||
  "user:pro";

export type PlanTier = "free" | "pro";

export interface PlanEntitlements {
  monthlyCredits: number;
  maxProjects: number;
  canUseRealtime: boolean;
  canUseHistory: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanTier, PlanEntitlements> = {
  free: {
    monthlyCredits: 3,
    maxProjects: 10,
    canUseRealtime: true,
    canUseHistory: false,
  },
  pro: {
    monthlyCredits: 100,
    maxProjects: 1000,
    canUseRealtime: true,
    canUseHistory: true,
  },
};
