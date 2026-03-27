import { getUsageStatus } from "@/lib/usage";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const usageRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    try {
      const usage = await getUsageStatus();
      return usage;
    } catch {
      return null;
    }
  }),
  resetOwn: protectedProcedure.mutation(async () => {
    const { userId } = await auth();
    if (!userId) return false;

    await prisma.usage.deleteMany({
      where: {
        key: {
          startsWith: `${userId}`,
        },
      },
    });

    return true;
  }),
});
