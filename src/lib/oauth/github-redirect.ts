import { env } from "@/config/env";

export function githubOAuthRedirectUri(): string {
  const base =
    env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3008");
  return `${base.replace(/\/$/, "")}/api/oauth/github/callback`;
}
