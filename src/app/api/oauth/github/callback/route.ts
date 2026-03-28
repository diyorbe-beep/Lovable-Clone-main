import { NextResponse } from "next/server";

import { upsertGitHubIntegration } from "@/lib/github/integration-store";
import { parseGitHubOAuthState } from "@/lib/oauth/github-state";
import { githubOAuthRedirectUri } from "@/lib/oauth/github-redirect";

type GitHubTokenResponse = {
  access_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

// Uses node-only crypto + Prisma via `src/lib/oauth/*` and `src/lib/prisma`.
export const runtime = "nodejs";

function withShipQuery(
  req: Request,
  pathOrUrl: string,
  extra: Record<string, string>,
) {
  const u = new URL(pathOrUrl, req.url);
  for (const [k, v] of Object.entries(extra)) {
    u.searchParams.set(k, v);
  }
  return NextResponse.redirect(u);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  const back = (path: string, extra: Record<string, string>) =>
    withShipQuery(req, path, extra);

  if (err) {
    return back("/", { ship: "github", error: err });
  }
  if (!code || !state) {
    return back("/", { ship: "github", error: "missing_code" });
  }

  const parsed = parseGitHubOAuthState(state);
  if (!parsed) {
    return back("/", { ship: "github", error: "invalid_state" });
  }

  const afterPath = parsed.next ?? "/";

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const encKey = process.env.INTEGRATION_ENCRYPTION_KEY;

  if (!clientId || !clientSecret) {
    return back(afterPath, { ship: "github", error: "server_misconfigured" });
  }
  if (!encKey || encKey.length < 32) {
    return back(afterPath, { ship: "github", error: "missing_encryption_key" });
  }

  const redirectUri = githubOAuthRedirectUri();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenJson = (await tokenRes.json()) as GitHubTokenResponse;
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return back(afterPath, {
      ship: "github",
      error: tokenJson.error ?? "token_denied",
    });
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!userRes.ok) {
    return back(afterPath, { ship: "github", error: "github_user" });
  }

  const ghUser = (await userRes.json()) as { login?: string };
  const login = ghUser.login;
  if (!login) {
    return back(afterPath, { ship: "github", error: "github_user" });
  }

  await upsertGitHubIntegration(
    parsed.userId,
    login,
    accessToken,
    tokenJson.scope ?? null,
    encKey,
  );

  return back(afterPath, { ship: "github", connected: "1" });
}
