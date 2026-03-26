import { RateLimiterPrisma } from 'rate-limiter-flexible';
import { auth } from '@clerk/nextjs/server';

import { CLERK_PRO_PLAN_CLAIM } from '@/config/billing';

import prisma from './prisma';

const FREE_POINTS = 1;
const PRO_POINTS = 100;
const DURATION = 30 * 24 * 60 * 60; // 30 days
const GENERATION_COST = 1;

function checkHasProPlan(
  has: ReturnType<Awaited<ReturnType<typeof auth>>['has']>,
): boolean {
  try {
    return has({ plan: CLERK_PRO_PLAN_CLAIM });
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
    throw new Error('User not authenticated');
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, GENERATION_COST);

  return result;
}

export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(userId);

  return result;
}
