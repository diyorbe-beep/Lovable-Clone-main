import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

const encoder = new TextEncoder();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
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
          const latestRun = await prisma.jobRun.findFirst({
            where: { projectId, userId },
            orderBy: { createdAt: "desc" },
          });
          send("run", latestRun ?? null);
        } catch {
          send("error", { message: "stream_failed" });
        }
      }, 1200);

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
