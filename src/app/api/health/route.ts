import { NextResponse } from "next/server";

import Logger from "@/lib/monitoring/logger";
import { MetricsCollector } from "@/lib/monitoring/metrics";
import prisma from "@/lib/prisma";
import { rateLimitHealthCheck } from "@/lib/security/rate-limiter";

export async function GET() {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const staleRuns = await prisma.jobRun.count({
      where: {
        status: { in: ["PENDING", "RUNNING"] },
        createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    const activeSubscriptions = await prisma.subscription.count({
      where: { status: "ACTIVE" },
    });

    const recentErrors =
      MetricsCollector.getMetric("error:rate_limit_exceeded")?.count || 0;

    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const responseTime = Date.now() - startTime;

    const isHealthy =
      staleRuns < 10 &&
      recentErrors < 50 &&
      memoryUsage.heapUsed < 500 * 1024 * 1024;

    Logger.info("Health check completed", {
      healthy: isHealthy,
      responseTime,
      staleRuns,
      activeSubscriptions,
      recentErrors,
      memoryUsage,
      uptime,
    });

    MetricsCollector.recordPerformance("health_check", responseTime);

    const healthData = {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      responseTime,
      services: {
        database: "up",
        redis: (await rateLimitHealthCheck()).redis ? "up" : "down",
        api: "up",
      },
      metrics: {
        staleRuns,
        activeSubscriptions,
        recentErrors,
        redis: await rateLimitHealthCheck(),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
      },
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    Logger.error("Health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      responseTime,
    });

    MetricsCollector.recordError("health_check_failed");
    MetricsCollector.recordPerformance("health_check", responseTime);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        services: {
          database: "down",
          api: "up",
        },
      },
      { status: 503 },
    );
  }
}
