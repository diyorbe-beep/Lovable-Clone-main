/**
 * Clerk Billing plan claim: must match `user:<plan_id>` from the Clerk dashboard.
 * Set `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` (and optionally `CLERK_PRO_PLAN_ID` on server) if your plan id is not `pro`.
 */
export const CLERK_PRO_PLAN_CLAIM =
  process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID ||
  process.env.CLERK_PRO_PLAN_ID ||
  "user:pro";
