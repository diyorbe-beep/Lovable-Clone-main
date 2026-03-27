import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { log } from "@/lib/logger";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ error, path }) => {
      log({
        level: "error",
        message: "tRPC request failed",
        error,
        meta: { path },
      });
    },
  });

export { handler as GET, handler as POST };
