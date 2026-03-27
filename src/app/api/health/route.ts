import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const staleRuns = await prisma.jobRun.count({
      where: {
        status: { in: ["PENDING", "RUNNING"] },
        createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    return Response.json({
      ok: true,
      db: "up",
      staleRuns,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        db: "down",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
