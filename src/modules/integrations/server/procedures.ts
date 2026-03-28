import { TRPCError } from "@trpc/server";

import { env } from "@/config/env";
import { deleteGitHubIntegration } from "@/lib/github/integration-store";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const integrationsRouter = createTRPCRouter({
  githubStatus: protectedProcedure.query(async ({ ctx }) => {
    const row = await prisma.gitHubIntegration.findUnique({
      where: { clerkUserId: ctx.appUser!.clerkId },
      select: { githubLogin: true, updatedAt: true, scope: true },
    });
    return {
      connected: Boolean(row),
      githubLogin: row?.githubLogin,
      scope: row?.scope,
      updatedAt: row?.updatedAt,
    };
  }),

  disconnectGitHub: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteGitHubIntegration(ctx.appUser!.clerkId);
    return { ok: true as const };
  }),

  triggerVercelDeploy: protectedProcedure.mutation(async () => {
    const url = env.VERCEL_DEPLOY_HOOK_URL;
    if (!url) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "VERCEL_DEPLOY_HOOK_URL is not configured. Add a deploy hook in Vercel (Project → Settings → Git).",
      });
    }
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: `Vercel hook returned ${res.status}`,
      });
    }
    return { ok: true as const };
  }),
});
