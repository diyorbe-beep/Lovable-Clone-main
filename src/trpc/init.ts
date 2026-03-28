import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { randomUUID } from "crypto";
import { ERROR_CODES } from "@/lib/errors";
import { ensureAppUser } from "@/lib/user-sync";

type BaseContext = {
  auth: Awaited<ReturnType<typeof auth>>;
  requestId: string;
};

export type AppUser = { id: string; clerkId: string };

export type Context = BaseContext & {
  /** Set by `protectedProcedure` after Clerk session is verified */
  appUser?: AppUser;
};

/** Do not wrap in React `cache()` — it can reuse stale `auth()` across tRPC /api requests and break Clerk sessions. */
export async function createTRPCContext(): Promise<BaseContext> {
  return { auth: await auth(), requestId: randomUUID() };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const isAuthed = t.middleware(async ({ next, ctx }) => {
  if (!ctx.auth.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ERROR_CODES.AUTH_REQUIRED,
    });
  }

  const appUser = await ensureAppUser(ctx.auth.userId);

  return next({
    ctx: {
      ...ctx,
      appUser,
    },
  });
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
