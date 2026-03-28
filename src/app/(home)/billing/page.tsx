"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { formatDuration, intervalToDuration } from "date-fns";
import { ArrowLeftIcon, CrownIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CLERK_PRO_PLAN_CLAIM, PLAN_ENTITLEMENTS } from "@/config/billing";
import { useTRPC } from "@/trpc/client";

function formatCredits(points: number) {
  if (points >= Number.MAX_SAFE_INTEGER - 1_000_000) {
    return "Unlimited";
  }
  return String(points);
}

export default function BillingPage() {
  const { has } = useAuth();
  const trpc = useTRPC();
  const hasPro = Boolean(has?.({ plan: CLERK_PRO_PLAN_CLAIM }));
  const tier = hasPro ? "pro" : "free";
  const plan = PLAN_ENTITLEMENTS[tier];

  const { data: usage, isLoading } = useQuery(trpc.usage.status.queryOptions());

  const resetLabel = useMemo(() => {
    const ms = usage?.msBeforeNext;
    if (ms == null || !Number.isFinite(ms) || ms <= 0) {
      return "—";
    }
    try {
      return formatDuration(
        intervalToDuration({
          start: new Date(),
          end: new Date(Date.now() + ms),
        }),
        { format: ["months", "days", "hours"] },
      );
    } catch {
      return "—";
    }
  }, [usage?.msBeforeNext]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-24">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" className="w-fit gap-2 pl-0" asChild>
          <Link href="/">
            <ArrowLeftIcon className="size-4" />
            Back to projects
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Usage &amp; plan
        </h1>
        <p className="text-muted-foreground text-sm">
          Credits and limits for AI generations. Upgrade for more capacity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current plan
            {hasPro ? (
              <CrownIcon className="text-amber-500 size-5" aria-hidden />
            ) : null}
          </CardTitle>
          <CardDescription>
            {hasPro ? "Pro" : "Free"} · {plan.monthlyCredits} monthly credits ·
            up to {plan.maxProjects} projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading usage…</p>
          ) : usage ? (
            <div className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums">
                {formatCredits(usage.remainingPoints)} credits left
              </p>
              <p className="text-muted-foreground text-sm">
                Window resets in {resetLabel}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Could not load usage.
            </p>
          )}

          {!hasPro ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/pricing" className="gap-2">
                <CrownIcon className="size-4" />
                Upgrade to Pro
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Subscription billing (Stripe) is configured via webhooks; manage
        payment methods in your Clerk account menu when connected.
      </p>
    </div>
  );
}
