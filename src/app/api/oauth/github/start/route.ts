import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createGitHubOAuthState } from "@/lib/oauth/github-state";
import { githubOAuthRedirectUri } from "@/lib/oauth/github-redirect";

const GITHUB_SCOPE = "repo read:user";

// Uses node-only crypto via `src/lib/oauth/github-state.ts`.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/?ship=github&error=missing_github_oauth", req.url),
    );
  }

  const nextParam = new URL(req.url).searchParams.get("next") ?? undefined;
  const state = createGitHubOAuthState(userId, nextParam);
  const redirectUri = githubOAuthRedirectUri();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", GITHUB_SCOPE);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
