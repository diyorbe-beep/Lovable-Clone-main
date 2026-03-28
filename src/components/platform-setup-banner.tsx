"use client";

import { useEffect, useState } from "react";

import type { PlatformHealth } from "@/lib/platform/health";

export function PlatformSetupBanner() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/platform/health")
      .then((r) => r.json())
      .then((data: PlatformHealth) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health) return null;
  if (health.agentReady && health.cloudPreviewReady && health.shipReady) {
    return null;
  }

  return (
    <div
      role="status"
      className="mx-auto mb-6 w-full max-w-3xl rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
    >
      <p className="font-semibold">Platform setup incomplete</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Add the variables below to{" "}
        <code className="rounded bg-background/50 px-1">.env.local</code> for
        automatic runs, stable previews, and GitHub ship.
      </p>
      <ul className="mt-3 space-y-2 text-xs">
        {!health.agentReady ? (
          <li>
            <span className="font-medium">Agent and jobs:</span>{" "}
            {health.missingAgent.join("; ")}
          </li>
        ) : null}
        {!health.cloudPreviewReady ? (
          <li>
            <span className="font-medium">Cloud preview:</span>{" "}
            {health.missingCloud.join("; ")}
          </li>
        ) : null}
        {!health.shipReady ? (
          <li>
            <span className="font-medium">Ship (GitHub):</span>{" "}
            {health.missingShip.join("; ")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
