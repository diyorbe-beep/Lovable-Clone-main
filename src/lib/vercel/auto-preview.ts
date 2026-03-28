import { env } from "@/config/env";

type DeploymentRow = {
  url?: string;
  readyState?: string;
};

/**
 * Fire deploy hook (rebuild from Git) and/or read latest READY deployment URL.
 */
export async function runAutoCloudPreviewPipeline(): Promise<{
  hookTriggered: boolean;
  deploymentUrl: string | null;
}> {
  let hookTriggered = false;
  const hook = env.VERCEL_DEPLOY_HOOK_URL;
  if (hook) {
    try {
      const res = await fetch(hook, { method: "POST" });
      hookTriggered = res.ok;
    } catch {
      hookTriggered = false;
    }
  }

  const deploymentUrl = await fetchLatestReadyDeploymentUrl();

  return { hookTriggered, deploymentUrl };
}

export async function fetchLatestReadyDeploymentUrl(): Promise<string | null> {
  const token = env.VERCEL_TOKEN?.trim();
  const projectId = env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    return (
      env.VERCEL_PRODUCTION_URL?.trim() ||
      env.HOSTED_FALLBACK_PREVIEW_URL?.trim() ||
      null
    );
  }

  const teamId = env.VERCEL_TEAM_ID?.trim();
  const sp = new URLSearchParams({
    projectId,
    limit: "15",
  });
  const url =
    teamId && teamId.length > 0
      ? `https://api.vercel.com/v6/deployments?teamId=${encodeURIComponent(teamId)}&${sp.toString()}`
      : `https://api.vercel.com/v6/deployments?${sp.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return (
        env.VERCEL_PRODUCTION_URL?.trim() ||
        env.HOSTED_FALLBACK_PREVIEW_URL?.trim() ||
        null
      );
    }
    const json = (await res.json()) as { deployments?: DeploymentRow[] };
    const list = json.deployments ?? [];
    const ready = list.find((d) => d.readyState === "READY" && d.url);
    if (ready?.url) {
      return ready.url.startsWith("http")
        ? ready.url
        : `https://${ready.url}`;
    }
    const any = list.find((d) => d.url);
    if (any?.url) {
      return any.url.startsWith("http") ? any.url : `https://${any.url}`;
    }
  } catch {
    /* ignore */
  }

  return (
    env.VERCEL_PRODUCTION_URL?.trim() ||
    env.HOSTED_FALLBACK_PREVIEW_URL?.trim() ||
    null
  );
}

export async function pollLatestReadyDeploymentUrl(
  attempts = 6,
  delayMs = 3500,
): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const u = await fetchLatestReadyDeploymentUrl();
    if (u) return u;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return (
    env.VERCEL_PRODUCTION_URL?.trim() ||
    env.HOSTED_FALLBACK_PREVIEW_URL?.trim() ||
    null
  );
}
