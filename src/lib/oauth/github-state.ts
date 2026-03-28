import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const s = process.env.CLERK_SECRET_KEY;
  if (!s) {
    throw new Error("CLERK_SECRET_KEY is required for GitHub OAuth state");
  }
  return s;
}

/** Relative path only, e.g. /projects/abc — avoids open redirects */
export function sanitizeOAuthNextPath(next: string | null | undefined): string | undefined {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return undefined;
  }
  return next;
}

export function createGitHubOAuthState(
  userId: string,
  nextPath?: string,
): string {
  const exp = Date.now() + 10 * 60 * 1000;
  const safeNext = sanitizeOAuthNextPath(nextPath ?? null);
  const payload = safeNext
    ? `${userId}.${exp}.${encodeURIComponent(safeNext)}`
    : `${userId}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ p: payload, s: sig }), "utf8").toString(
    "base64url",
  );
}

export function parseGitHubOAuthState(
  state: string,
): { userId: string; next?: string } | null {
  try {
    const { p, s } = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { p: string; s: string };
    const parts = p.split(".");
    if (parts.length !== 2 && parts.length !== 3) return null;
    const userId = parts[0]!;
    const exp = Number(parts[1]);
    const next =
      parts.length === 3 && parts[2]
        ? sanitizeOAuthNextPath(decodeURIComponent(parts[2]))
        : undefined;
    if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
    const expected = createHmac("sha256", getSecret()).update(p).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(s, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { userId, next };
  } catch {
    return null;
  }
}
