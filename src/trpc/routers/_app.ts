import { integrationsRouter } from "@/modules/integrations/server/procedures";
import { jobsRouter } from "@/modules/jobs/server/procedure";
import { messagesRouter } from "@/modules/messages/server/procedures";
import { projectsRouter } from "@/modules/projects/server/procedures";
import { usageRouter } from "@/modules/usage/server/procedure";
import { workspaceRouter } from "@/modules/workspace/server/procedures";
import { createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  projects: projectsRouter,
  jobs: jobsRouter,
  usage: usageRouter,
  workspace: workspaceRouter,
  integrations: integrationsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
