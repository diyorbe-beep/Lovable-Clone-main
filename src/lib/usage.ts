import { RateLimiterPrisma } from 'rate-limiter-flexible';
import { auth } from '@clerk/nextjs/server';

import { CLERK_PRO_PLAN_CLAIM, PLAN_ENTITLEMENTS } from '@/config/billing';
import { env } from '@/config/env';
import { AppError, ERROR_CODES } from './errors';
import { log } from './logger';

import prisma from './prisma';

const FREE_POINTS = env.FREE_POINTS_LIMIT ?? PLAN_ENTITLEMENTS.free.monthlyCredits;
const PRO_POINTS = env.PRO_POINTS_LIMIT ?? PLAN_ENTITLEMENTS.pro.monthlyCredits;
const DURATION = (env.USAGE_WINDOW_DAYS ?? 30) * 24 * 60 * 60;
const GENERATION_COST = env.GENERATION_COST ?? 1;

function checkHasProPlan(
  has: Awaited<ReturnType<typeof auth>>["has"],
): boolean {
  try {
    return Boolean(has?.({ plan: CLERK_PRO_PLAN_CLAIM }));
  } catch {
    return false;
  }
}

export async function getUsageTracker() {
  const { has } = await auth();
  const hasProAccess = checkHasProPlan(has);

  const usageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: 'Usage',
    points: hasProAccess ? PRO_POINTS : FREE_POINTS,
    duration: DURATION,
  });

  return usageTracker;
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_REQUIRED, 'User not authenticated');
  }

  // Local/development testing should not be blocked by credit limits.
  if (env.NODE_ENV !== "production") {
    return {
      remainingPoints: Number.MAX_SAFE_INTEGER,
      msBeforeNext: 0,
      consumedPoints: 0,
      isFirstInDuration: false,
    };
  }

  const usageTracker = await getUsageTracker();
  try {
    const result = await usageTracker.consume(userId, GENERATION_COST);
    return result;
  } catch (error) {
    log({
      level: "warn",
      message: "Usage limit reached",
      userId,
      code: ERROR_CODES.USAGE_LIMIT_EXCEEDED,
      error,
    });
    throw new AppError(ERROR_CODES.USAGE_LIMIT_EXCEEDED, "You ran out of credits", error);
  }
}

export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_REQUIRED, 'User not authenticated');
  }

  if (env.NODE_ENV !== "production") {
    return {
      remainingPoints: Number.MAX_SAFE_INTEGER,
      msBeforeNext: 0,
      consumedPoints: 0,
      isFirstInDuration: false,
    };
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(userId);

  return result;
}
