import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/prisma";
import { ensureDefaultWorkspace } from "@/lib/workspace";

export const workspaceRouter = createTRPCRouter({
  /** Current user's primary workspace (creates default if missing). */
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const ws = await ensureDefaultWorkspace(ctx.appUser!.id);
    const row = await prisma.workspace.findUnique({
      where: { id: ws.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        members: {
          where: { userId: ctx.appUser!.id },
          take: 1,
          select: { role: true },
        },
        _count: {
          select: { members: true, projects: true },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      role: row.members[0]?.role ?? "MEMBER",
      memberCount: row._count.members,
      projectCount: row._count.projects,
      createdAt: row.createdAt,
    };
  }),
});
