import { NextResponse } from "next/server";

import { getPlatformHealth } from "@/lib/platform/health";

export async function GET() {
  const health = getPlatformHealth();
  return NextResponse.json(health);
}
