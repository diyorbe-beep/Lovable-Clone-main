import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { env } from "@/config/env";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) {
    return NextResponse.json(
      {
        error:
          "VERCEL_DEPLOY_HOOK_URL is not configured. (Vercel → Project → Settings → Git → Deploy Hooks)",
      },
      { status: 412 },
    );
  }

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Vercel hook returned ${res.status}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

