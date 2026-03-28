import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { ensureAppUser } from "@/lib/user-sync";

const encoder = new TextEncoder();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const appUser = await ensureAppUser(clerkUserId);

  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: appUser.id },
    select: { id: true },
  });

  if (!project) {
    return new Response("Not found", { status: 404 });
  }

  let interval: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("connected", { ok: true });

      interval = setInterval(async () => {
        try {
          const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM "JobRun" WHERE "projectId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC LIMIT 1`,
            projectId,
            appUser.id,
          );
          send("run", rows[0] ?? null);
        } catch {
          send("error", { message: "stream_failed" });
        }
      }, 400);

    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
