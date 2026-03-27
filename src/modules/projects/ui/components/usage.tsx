import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDuration, intervalToDuration } from 'date-fns';
import { CrownIcon, RotateCcwIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { CLERK_PRO_PLAN_CLAIM } from '@/config/billing';
import { useTRPC } from '@/trpc/client';

interface UsageProps {
  points: number;
  msBeforeNext: number;
}

function formatCredits(points: number) {
  if (points >= Number.MAX_SAFE_INTEGER - 1_000_000) {
    return "Unlimited";
  }
  return String(points);
}

const Usage = ({ msBeforeNext, points }: UsageProps) => {
  const { has } = useAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const hasProAccess = has?.({ plan: CLERK_PRO_PLAN_CLAIM });
  const resetOwnUsage = useMutation(
    trpc.usage.resetOwn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
      },
    }),
  );

  const resetTime = useMemo(() => {
    if (!Number.isFinite(msBeforeNext) || msBeforeNext <= 0) {
      return "—";
    }
    try {
      return formatDuration(
        intervalToDuration({
          start: new Date(),
          end: new Date(Date.now() + msBeforeNext),
        }),
        { format: ['months', 'days', 'hours'] },
      );
    } catch (error) {
      console.error('Error formatting duration ' + error);
      return 'unknown';
    }
  }, [msBeforeNext]);

  return (
    <div className="rounded-t-xl bg-background border border-b-0 p-2.5">
      <div className="flex items-center gap-x-2">
        <div>
          <p className="text-sm">
            {formatCredits(points)} {hasProAccess ? '' : 'free'} credits remaining
          </p>
          <p className="text-xs text-muted-foreground">Resets in {resetTime}</p>
        </div>

        {!hasProAccess && (
          <div className="ml-auto flex items-center gap-2">
            {process.env.NODE_ENV === 'development' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetOwnUsage.mutate()}
                disabled={resetOwnUsage.isPending}
              >
                <RotateCcwIcon />
                Reset
              </Button>
            )}
            <Button asChild size="sm" variant="tertiary">
              <Link href="/pricing">
                <CrownIcon /> Upgrade
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export { Usage };
