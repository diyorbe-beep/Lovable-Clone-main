import { TRPCError } from "@trpc/server";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";

import { AGENT_PROMPT_VERSION } from "@/constants";
import { env } from "@/config/env";
import { AppError, ERROR_CODES, toTRPCError } from "@/lib/errors";
import { dispatchCodeAgentRun } from "@/lib/inngest-dispatch";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getMaxActiveRunsPerUser } from "@/lib/run-policy";
import { consumeCredits } from "@/lib/usage";
import { writeAuditLog } from "@/lib/audit";
import { ensureDefaultWorkspace } from "@/lib/workspace";
import { expireStaleRunsForUser } from "@/lib/runs";
import { getGitHubTokenForClerkUser } from "@/lib/github/integration-store";
import { GitHubPushError, pushFilesToGitHubBranch } from "@/lib/github/push-files";
import { Prisma } from "@/generated/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import type { FileCollection } from "@/types";
import { ensureHostedProjectEnvironment } from "@/lib/hosted/provision";

async function requireOwnedProject(
  projectId: string,
  userId: string,
): Promise<{ id: string; name: string }> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, name: true },
  });
  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }
  return project;
}

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "id is required" }),
      })
    )
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.appUser!.id,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return existingProject;
    }),
  getHosted: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      await requireOwnedProject(input.projectId, ctx.appUser!.id);
      const row = await prisma.hostedProjectEnvironment.findUnique({
        where: { projectId: input.projectId },
      });
      if (!row) return null;
      return {
        status: row.status,
        postgresSchema: row.postgresSchema,
        publicSupabaseUrl: row.publicSupabaseUrl,
        persistentPreviewUrl: row.persistentPreviewUrl,
        vercelDeploymentUrl: row.vercelDeploymentUrl,
        lastError: row.lastError,
      };
    }),

  getMany: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: {
        userId: ctx.appUser!.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return projects;
  }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Value is required" })
          .max(10_000, { message: "Value is too long" }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await expireStaleRunsForUser(ctx.appUser!.id);

      const activeRunsCount = await prisma.jobRun.count({
        where: {
          userId: ctx.appUser!.id,
          status: { in: ["PENDING", "RUNNING"] },
        },
      });

      if (activeRunsCount >= getMaxActiveRunsPerUser()) {
        throw toTRPCError(
          new AppError(
            ERROR_CODES.RUN_ALREADY_ACTIVE,
            "Active run limit reached. Finish or cancel current generation before starting a new one."
          )
        );
      }

      try {
        await consumeCredits();
      } catch (error) {
        log({
          level: "warn",
          message: "projects.create consumeCredits failed",
          requestId: ctx.requestId,
          userId: ctx.appUser!.id,
          code:
            error instanceof AppError
              ? error.code
              : ERROR_CODES.USAGE_CONFIGURATION_ERROR,
          error,
        });
        throw toTRPCError(error);
      }

      const workspace = await ensureDefaultWorkspace(ctx.appUser!.id);

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.appUser!.id,
          workspaceId: workspace.id,
          name: generateSlug(2, { format: "kebab" }),
        },
      });

      void ensureHostedProjectEnvironment(createdProject.id).catch(() => {
        /* non-fatal: DB role may lack CREATE SCHEMA */
      });

      const createdRun = await prisma.jobRun.create({
        data: {
          projectId: createdProject.id,
          userId: ctx.appUser!.id,
          input: input.value,
          status: "PENDING",
          promptVersion: AGENT_PROMPT_VERSION,
        },
      });

      await prisma.message.create({
        data: {
          projectId: createdProject.id,
          content: input.value,
          role: "USER",
          type: "RESULT",
          runStatus: "PENDING",
          runId: createdRun.id,
        },
      });

      try {
        await dispatchCodeAgentRun({
          value: input.value,
          projectId: createdProject.id,
          runId: createdRun.id,
          userId: ctx.appUser!.id,
          requestId: ctx.requestId,
        });
      } catch (error) {
        await prisma.jobRun.update({
          where: { id: createdRun.id },
          data: {
            status: "FAILED",
            errorCode: ERROR_CODES.INNGEST_DISPATCH_FAILED,
            errorMessage: "Dispatch failed before execution",
            finishedAt: new Date(),
          },
        });
        await prisma.message.updateMany({
          where: {
            runId: createdRun.id,
            role: "USER",
          },
          data: {
            runStatus: "FAILED",
          },
        });
        log({
          level: "error",
          message: "Failed to dispatch Inngest event",
          requestId: ctx.requestId,
          userId: ctx.appUser!.id,
          projectId: createdProject.id,
          code: ERROR_CODES.INNGEST_DISPATCH_FAILED,
          error,
        });
        throw toTRPCError(
          new AppError(
            ERROR_CODES.INNGEST_DISPATCH_FAILED,
            error instanceof Error ? error.message : "AI job dispatch failed. Please try again.",
            error,
          ),
        );
      }

      await writeAuditLog({
        actorId: ctx.appUser!.id,
        action: "project.created",
        resourceId: createdProject.id,
        metadata: { runId: createdRun.id },
      });

      return createdProject;
    }),

  listRunHistory: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      await requireOwnedProject(input.projectId, ctx.appUser!.id);

      const runs = await prisma.jobRun.findMany({
        where: {
          projectId: input.projectId,
          userId: ctx.appUser!.id,
          status: "SUCCEEDED",
          messages: {
            some: {
              role: "ASSISTANT",
              fragment: { isNot: null },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          input: true,
          summary: true,
          createdAt: true,
          finishedAt: true,
          messages: {
            where: {
              role: "ASSISTANT",
              type: "RESULT",
              fragment: { isNot: null },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              fragment: {
                select: {
                  id: true,
                  messageId: true,
                  sandboxUrl: true,
                  title: true,
                  files: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      });

      return runs.flatMap((run) => {
        const fragment = run.messages[0]?.fragment;
        if (!fragment) return [];
        return [
          {
            runId: run.id,
            promptPreview: run.input.slice(0, 160),
            summary: run.summary,
            finishedAt: run.finishedAt,
            fragment,
          },
        ];
      });
    }),

  getRunExport: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        runId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireOwnedProject(input.projectId, ctx.appUser!.id);

      const run = await prisma.jobRun.findFirst({
        where: {
          id: input.runId,
          projectId: input.projectId,
          userId: ctx.appUser!.id,
          status: "SUCCEEDED",
        },
        include: {
          messages: {
            where: {
              role: "ASSISTANT",
              fragment: { isNot: null },
            },
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { fragment: true },
          },
        },
      });

      const fragment = run?.messages[0]?.fragment;
      if (!fragment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No exportable build for this run",
        });
      }

      return {
        title: fragment.title,
        files: fragment.files as FileCollection,
        sandboxUrl: fragment.sandboxUrl,
      };
    }),

  pushToGitHub: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        runId: z.string().min(1),
        owner: z
          .string()
          .min(1)
          .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/),
        repo: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9._-]+$/),
        branch: z.string().min(1).max(255).default("main"),
        /** Omit when GitHub is connected via OAuth and INTEGRATION_ENCRYPTION_KEY is set */
        token: z.string().min(1).max(8192).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireOwnedProject(input.projectId, ctx.appUser!.id);

      const encKey = env.INTEGRATION_ENCRYPTION_KEY;
      let token = input.token ?? "";
      if (!token && encKey) {
        const stored = await getGitHubTokenForClerkUser(
          ctx.appUser!.clerkId,
          encKey,
        );
        if (stored) token = stored;
      }
      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "GitHub token required, or connect GitHub in Ship (OAuth) with INTEGRATION_ENCRYPTION_KEY set.",
        });
      }

      const exportPayload = await prisma.jobRun.findFirst({
        where: {
          id: input.runId,
          projectId: input.projectId,
          userId: ctx.appUser!.id,
          status: "SUCCEEDED",
        },
        include: {
          messages: {
            where: { role: "ASSISTANT", fragment: { isNot: null } },
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { fragment: true },
          },
        },
      });

      const fragment = exportPayload?.messages[0]?.fragment;
      if (!fragment?.files) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No files to push for this run",
        });
      }

      const files = fragment.files as FileCollection;
      if (typeof files !== "object" || Array.isArray(files)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid file map on fragment",
        });
      }

      try {
        const result = await pushFilesToGitHubBranch({
          token,
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          files,
          commitMessage: `chore: sync from Lovable Clone — ${fragment.title}`,
        });

        await writeAuditLog({
          actorId: ctx.appUser!.id,
          action: "project.github_push",
          resourceId: input.projectId,
          metadata: {
            runId: input.runId,
            repo: `${input.owner}/${input.repo}`,
            branch: input.branch,
          } as Prisma.JsonObject,
        });

        return result;
      } catch (err) {
        if (err instanceof GitHubPushError) {
          throw new TRPCError({
            code: err.code === "AUTH" ? "UNAUTHORIZED" : "BAD_REQUEST",
            message: err.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error ? err.message : "GitHub push failed",
        });
      }
    }),

  listSnapshots: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      await requireOwnedProject(input.projectId, ctx.appUser!.id);
      return prisma.projectSnapshot.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          label: true,
          createdAt: true,
          sandboxUrl: true,
          summaryLine: true,
          sourceRunId: true,
        },
      });
    }),

  restoreFromSnapshot: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        snapshotId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireOwnedProject(input.projectId, ctx.appUser!.id);
      const snap = await prisma.projectSnapshot.findFirst({
        where: { id: input.snapshotId, projectId: input.projectId },
      });
      if (!snap) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Snapshot not found",
        });
      }
      const files = snap.files as FileCollection;
      if (typeof files !== "object" || files === null || Array.isArray(files)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid snapshot files",
        });
      }
      const msg = await prisma.message.create({
        data: {
          projectId: input.projectId,
          content: `Restored version: ${snap.label}`,
          role: "ASSISTANT",
          type: "RESULT",
          runStatus: "SUCCEEDED",
          fragment: {
            create: {
              sandboxUrl: snap.sandboxUrl || "",
              title: snap.label,
              files: files as object,
            },
          },
        },
        include: { fragment: true },
      });
      await writeAuditLog({
        actorId: ctx.appUser!.id,
        action: "project.snapshot_restore",
        resourceId: input.projectId,
        metadata: { snapshotId: snap.id } as Prisma.JsonObject,
      });
      return msg;
    }),

  /**
   * New project seeded from latest snapshot, a specific snapshot, or the latest assistant fragment (Lovable-style remix).
   */
  duplicate: protectedProcedure
    .input(
      z.object({
        sourceProjectId: z.string().min(1),
        snapshotId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const source = await requireOwnedProject(
        input.sourceProjectId,
        ctx.appUser!.id,
      );

      let files: FileCollection;
      let title: string;
      let sandboxUrl: string;

      if (input.snapshotId) {
        const snap = await prisma.projectSnapshot.findFirst({
          where: {
            id: input.snapshotId,
            projectId: input.sourceProjectId,
          },
        });
        if (!snap) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Snapshot not found",
          });
        }
        files = snap.files as FileCollection;
        title = snap.label;
        sandboxUrl = snap.sandboxUrl || "";
      } else {
        const latestSnap = await prisma.projectSnapshot.findFirst({
          where: { projectId: input.sourceProjectId },
          orderBy: { createdAt: "desc" },
        });
        if (latestSnap) {
          files = latestSnap.files as FileCollection;
          title = latestSnap.label;
          sandboxUrl = latestSnap.sandboxUrl || "";
        } else {
          const msg = await prisma.message.findFirst({
            where: {
              projectId: input.sourceProjectId,
              type: "RESULT",
              fragment: { isNot: null },
            },
            orderBy: { createdAt: "desc" },
            include: { fragment: true },
          });
          if (!msg?.fragment) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Nothing to duplicate yet. Finish a generation first, or pick a snapshot in Ship.",
            });
          }
          files = msg.fragment.files as FileCollection;
          title = msg.fragment.title;
          sandboxUrl = msg.fragment.sandboxUrl;
        }
      }

      if (typeof files !== "object" || files === null || Array.isArray(files)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid file data for duplicate",
        });
      }

      const workspace = await ensureDefaultWorkspace(ctx.appUser!.id);
      const newProject = await prisma.project.create({
        data: {
          userId: ctx.appUser!.id,
          workspaceId: workspace.id,
          name: generateSlug(2, { format: "kebab" }),
        },
      });

      void ensureHostedProjectEnvironment(newProject.id).catch(() => {});

      await prisma.message.create({
        data: {
          projectId: newProject.id,
          content: `Remix of **${source.name}** — copied "${title.slice(0, 120)}".`,
          role: "ASSISTANT",
          type: "RESULT",
          runStatus: "SUCCEEDED",
          fragment: {
            create: {
              sandboxUrl,
              title: title.slice(0, 200),
              files: files as object,
            },
          },
        },
      });

      await writeAuditLog({
        actorId: ctx.appUser!.id,
        action: "project.duplicate",
        resourceId: newProject.id,
        metadata: {
          sourceProjectId: input.sourceProjectId,
          snapshotId: input.snapshotId ?? null,
        } as Prisma.JsonObject,
      });

      return newProject;
    }),

  shipAll: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        runId: z.string().min(1),
        owner: z
          .string()
          .min(1)
          .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/),
        repo: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9._-]+$/),
        branch: z.string().min(1).max(255).default("main"),
        token: z.string().min(1).max(8192).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireOwnedProject(input.projectId, ctx.appUser!.id);
      const encKey = env.INTEGRATION_ENCRYPTION_KEY;
      let token = input.token ?? "";
      if (!token && encKey) {
        const stored = await getGitHubTokenForClerkUser(
          ctx.appUser!.clerkId,
          encKey,
        );
        if (stored) token = stored;
      }
      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "GitHub token required, or connect GitHub OAuth with encryption configured.",
        });
      }

      const exportPayload = await prisma.jobRun.findFirst({
        where: {
          id: input.runId,
          projectId: input.projectId,
          userId: ctx.appUser!.id,
          status: "SUCCEEDED",
        },
        include: {
          messages: {
            where: { role: "ASSISTANT", fragment: { isNot: null } },
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { fragment: true },
          },
        },
      });
      const fragment = exportPayload?.messages[0]?.fragment;
      if (!fragment?.files) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No files to ship for this run",
        });
      }
      const files = fragment.files as FileCollection;

      let push: { commitHtmlUrl: string };
      try {
        push = await pushFilesToGitHubBranch({
          token,
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          files,
          commitMessage: `chore: ship from Lovable Clone — ${fragment.title}`,
        });
      } catch (err) {
        if (err instanceof GitHubPushError) {
          throw new TRPCError({
            code: err.code === "AUTH" ? "UNAUTHORIZED" : "BAD_REQUEST",
            message: err.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error ? err.message : "GitHub push failed",
        });
      }

      let deployOk: boolean | null = null;
      const hook = env.VERCEL_DEPLOY_HOOK_URL;
      if (hook) {
        const res = await fetch(hook, { method: "POST" });
        deployOk = res.ok;
        if (!res.ok) {
          log({
            level: "warn",
            message: "shipAll Vercel hook failed",
            meta: { status: res.status },
          });
        }
      }

      await writeAuditLog({
        actorId: ctx.appUser!.id,
        action: "project.ship_all",
        resourceId: input.projectId,
        metadata: {
          runId: input.runId,
          repo: `${input.owner}/${input.repo}`,
          branch: input.branch,
          deployTriggered: deployOk,
        } as Prisma.JsonObject,
      });

      return { ...push, deployTriggered: deployOk };
    }),
});
