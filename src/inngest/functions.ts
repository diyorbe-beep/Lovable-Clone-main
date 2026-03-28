import { Sandbox } from '@e2b/code-interpreter';
import {
  createAgent,
  createNetwork,
  createState,
  createTool,
  type Message,
} from '@inngest/agent-kit';
import { z } from 'zod';

import { buildCodeAgentModel } from '@/lib/agent/code-agent-model';
import {
  getDefaultCodeAgentRouting,
  normalizeCodeAgentProvider,
} from '@/lib/agent/code-agent-routing';
import { streamAgentPreambleToProgress } from '@/lib/agent/preamble-stream';
import { extractVisualContextFromImage } from '@/lib/agent/vision-preflight';
import { env } from '@/config/env';
import { mergeSandboxEnvLocal } from '@/lib/hosted/sandbox-env';
import { ensureHostedProjectEnvironment } from '@/lib/hosted/provision';
import {
  pollLatestReadyDeploymentUrl,
  runAutoCloudPreviewPipeline,
  fetchLatestReadyDeploymentUrl,
} from '@/lib/vercel/auto-preview';
import { ERROR_CODES } from '@/lib/errors';
import { safeParseAgentOutput } from '@/lib/agent-output';
import { quickAgentIntentLine } from '@/lib/gemini-quick';
import { buildProjectGraph, formatGraphSummary } from '@/lib/project-intelligence';
import { expandPatchTargets } from '@/lib/patch-engine';
import { log } from '@/lib/logger';
import { mergeFileCollections } from '@/lib/patch-merge';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import { sandboxLintVerify } from '@/lib/sandbox-verify';
import { sandboxRunTests } from '@/lib/sandbox-test';
import {
  clearRunProgress,
  mergeRunProgress,
  truncateStreamText,
} from '@/lib/run-progress';
import { PROMPT } from '@/prompt';
import { FileCollection } from '@/types';
import { inngest } from './client';
import {
  cleanupSandbox,
  getSandbox,
  lastAssistantTextMessageContent,
} from './utils';
import { AGENT_PROMPT_VERSION, SANDBOX_TIMEOUT_IN_MS } from '@/constants';

interface AgentState {
  plan: string;
  architecture: string;
  summary: string;
  files: FileCollection;
  /** When >0, router prefers fixer over reviewer so codegen can run again. */
  bypassReviewerRounds?: number;
}

const FIXER_SYSTEM = `${PROMPT}\n\nYou are the fixer role: apply the smallest possible patches. Honor state.architecture for file boundaries. Re-read affected files before editing. You MUST finish with a valid <task_summary>...</task_summary> and concrete files.`;

/** Timeout / transport xatolarda qayta urinish */
const MAX_RETRIES = 1;
const VALIDATION_FIX_PASSES = 3;
const LINT_FIX_PASSES = 3;
const TEST_FIX_PASSES = 3;
const FIXER_CODE_ROUNDS = 5;
const RUN_TIMEOUT_MS = 3 * 60 * 1000;
const SANDBOX_CREATE_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_NETWORK_ITER = 12;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Run timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timeout));
  });
}

function deriveTitle(summary: string) {
  const cleaned = summary
    .replace(/<\/?task_summary>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").slice(0, 3);
  const joined = words.join(" ").trim();
  return joined ? joined[0].toUpperCase() + joined.slice(1) : "Generated App";
}

function summaryToUserMessage(summary: string) {
  const cleaned = summary.replace(/<\/?task_summary>/g, "").trim();
  return cleaned || "Build complete.";
}

function touchRepairRound(
  network: { state: { data: AgentState } } | null | undefined,
) {
  if (!network) return;
  const n = network.state.data.bypassReviewerRounds ?? 0;
  if (n > 0) network.state.data.bypassReviewerRounds = n - 1;
}

export const codeAgentFunction = inngest.createFunction(
  { id: 'code-agent' },
  { event: 'code-agent/run' },
  async ({ event, step }) => {
    const startedAtMs = Date.now();
    const promptVersion = AGENT_PROMPT_VERSION;
    const fallbackRoute = getDefaultCodeAgentRouting();
    const eventProvider = normalizeCodeAgentProvider(
      (event.data as { provider?: string }).provider,
    );
    const rawModel = (event.data as { model?: string }).model;
    const agentModelId =
      typeof rawModel === "string" && rawModel.trim()
        ? rawModel.trim()
        : fallbackRoute.model;
    const agentProvider = eventProvider ?? fallbackRoute.provider;

    log({
      level: "info",
      message: "AI run started",
      projectId: event.data.projectId,
      runId: event.data.runId,
      meta: {
        promptVersion,
        model: agentModelId,
        provider: agentProvider,
      },
    });

    const runExtras = event.data as {
      runMode?: string;
      visualTarget?: { path: string; selector?: string };
      previousFilesOverride?: FileCollection;
    };
    let agentUserMessage = event.data.value;
    if (runExtras.runMode === "debug") {
      agentUserMessage = `[DEBUG_MODE: diagnose build/runtime issues — read related files, minimal fixes, cite root cause in task_summary]\n\n${agentUserMessage}`;
    }
    if (runExtras.visualTarget?.path) {
      const vt = runExtras.visualTarget;
      agentUserMessage = `[VISUAL_TARGET path="${vt.path}"${vt.selector ? ` hint="${vt.selector}"` : ""}]\nPrefer edits in that file; preserve public exports.\n\n${agentUserMessage}`;
    }

    const visionPrefix = await step.run("vision-preflight", async () => {
      const rid = event.data.runId;
      if (!rid) return "";
      const run = await prisma.jobRun.findUnique({
        where: { id: rid },
        select: { inputContext: true },
      });
      const ctx = run?.inputContext as
        | {
            visual?: { mimeType?: string; base64?: string };
          }
        | null
        | undefined;
      const visual = ctx?.visual;
      if (
        !visual?.base64 ||
        typeof visual.base64 !== "string" ||
        !visual.mimeType
      ) {
        return "";
      }
      const description = await extractVisualContextFromImage({
        provider: agentProvider,
        model: agentModelId,
        userText: agentUserMessage,
        mimeType: visual.mimeType,
        base64: visual.base64,
      });
      await prisma.jobRun.update({
        where: { id: rid },
        data: { inputContext: Prisma.DbNull },
      });
      if (!description?.trim()) return "";
      return `[USER_INTERFACE_SCREENSHOT]\n${description.trim()}\n\n`;
    });

    agentUserMessage = `${visionPrefix}${agentUserMessage}`;

    const assertNotCancelled = async () => {
      if (!event.data.runId) return;
      const run = await prisma.jobRun.findUnique({ where: { id: event.data.runId } });
      if (run?.status === "CANCELLED") {
        throw new Error(ERROR_CODES.RUN_CANCELLED);
      }
    };

    await step.run('mark-run-running', async () => {
      if (!event.data.runId) return;
      const existing = await prisma.jobRun.findUnique({
        where: { id: event.data.runId },
      });
      if (!existing) return;
      if (existing.status === "SUCCEEDED") return;
      if (existing.status === "FAILED") {
        throw new Error("Run already finished");
      }
      await prisma.jobRun.update({
        where: { id: event.data.runId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          promptVersion,
        },
      });
      await prisma.message.updateMany({
        where: {
          runId: event.data.runId,
          role: "USER",
        },
        data: {
          runStatus: "RUNNING",
        },
      });
    });

    const sandboxId = await step.run('get-sandbox-id', async () => {
      await assertNotCancelled();
      if (!env.E2B_API_KEY) {
        throw new Error(
          'E2B_API_KEY is missing. Add it to .env.local and restart dev servers.',
        );
      }
      const hasLlm =
        Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) ||
        Boolean(env.GOOGLE_API_KEY?.trim()) ||
        Boolean(env.OPENAI_API_KEY?.trim()) ||
        Boolean(env.ANTHROPIC_API_KEY?.trim());
      if (!hasLlm) {
        throw new Error(
          "No LLM API key configured. Set one of: GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env.local.",
        );
      }

      const sandbox = await withTimeout(
        Sandbox.create('vibe-nextjs-bek-2'),
        SANDBOX_CREATE_TIMEOUT_MS,
      );
      await sandbox.setTimeout(SANDBOX_TIMEOUT_IN_MS);
      return sandbox.sandboxId;
    });

    await step.run("ensure-hosted", async () => {
      await ensureHostedProjectEnvironment(event.data.projectId);
    });

    await step.run("seed-hosted-sandbox", async () => {
      const hosted = await prisma.hostedProjectEnvironment.findUnique({
        where: { projectId: event.data.projectId },
      });
      if (!hosted || hosted.status !== "active") return;
      const sandbox = await getSandbox(sandboxId);
      const origin = env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
      const md = `# Platform hosted\n- Postgres schema: ${hosted.postgresSchema}\n- Server env: DATABASE_URL + HOSTED_PG_SCHEMA are merged into .env.local before the dev server restarts.\n- Visual bridge: ${origin}/api/preview/bridge?parent=${encodeURIComponent(origin)}\n`;
      try {
        await sandbox.files.write("HOSTED_PLATFORM.md", md);
        await mergeSandboxEnvLocal(sandbox, {
          HOSTED_PG_SCHEMA: hosted.postgresSchema,
          NEXT_PUBLIC_PLATFORM_ORIGIN: origin,
          NEXT_PUBLIC_SUPABASE_URL: hosted.publicSupabaseUrl ?? "",
          DATABASE_URL: env.DATABASE_URL,
        });
        await sandbox.commands.run(
          `bash -lc 'cd /home/user && pkill -f "next dev" 2>/dev/null || true; sleep 2; nohup npm run dev > /tmp/next-dev.log 2>&1 & sleep 5'`,
          { timeoutMs: 120_000 },
        );
      } catch (e) {
        log({
          level: "warn",
          message: "seed-hosted-sandbox failed partially",
          projectId: event.data.projectId,
          error: e,
        });
      }
    });

    const previousContext = await step.run(
      'get-previous-context',
      async () => {
        const formattedMessages: Message[] = [];

        const lastWithFiles = await prisma.message.findFirst({
          where: {
            projectId: event.data.projectId,
            type: "RESULT",
            fragment: { isNot: null },
          },
          orderBy: { createdAt: "desc" },
          include: { fragment: true },
        });

        const fromDb =
          (lastWithFiles?.fragment?.files as FileCollection) || {};
        const previousFiles =
          runExtras.previousFilesOverride &&
          typeof runExtras.previousFilesOverride === "object" &&
          !Array.isArray(runExtras.previousFilesOverride)
            ? (runExtras.previousFilesOverride as FileCollection)
            : fromDb;

        const memoryRows = await prisma.projectMemory.findMany({
          where: { projectId: event.data.projectId },
          orderBy: { updatedAt: "desc" },
          take: 14,
        });
        const memoryDigest = memoryRows.length
          ? memoryRows
              .map(
                (r) =>
                  `- ${r.key}: ${JSON.stringify(r.value).slice(0, 360)}`,
              )
              .join("\n")
          : "";

        const intelSummary =
          Object.keys(previousFiles).length > 0
            ? formatGraphSummary(buildProjectGraph(previousFiles), 56)
            : "";

        const previousRun = await prisma.jobRun.findFirst({
          where: { projectId: event.data.projectId, summary: { not: null } },
          orderBy: { createdAt: 'desc' },
        });

        const messages = await prisma.message.findMany({
          where: {
            projectId: event.data.projectId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 12,
        });

        const contextualMessages = messages
          .filter((message) => message.type === "RESULT")
          .slice(0, 8);

        for (const message of contextualMessages) {
          formattedMessages.push({
            type: 'text',
            role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
            content: message.content,
          });
        }

        if (previousRun?.summary) {
          formattedMessages.unshift({
            type: 'text',
            role: 'assistant',
            content: `Previous run summary:\n${previousRun.summary}`,
          });
        }

        const contextHead: Message[] = [];
        if (
          intelSummary &&
          !intelSummary.includes("no local import graph yet")
        ) {
          contextHead.push({
            type: "text",
            role: "user",
            content: `### Project dependency map (auto-generated)\n${intelSummary}`,
          });
        }
        if (memoryDigest) {
          contextHead.push({
            type: "text",
            role: "user",
            content: `### Learned project memory\n${memoryDigest}`,
          });
        }

        const hostedRow = await prisma.hostedProjectEnvironment.findUnique({
          where: { projectId: event.data.projectId },
        });
        if (hostedRow?.postgresSchema && hostedRow.status === "active") {
          const bridgeOrigin = env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
          const enc = encodeURIComponent(bridgeOrigin);
          contextHead.push({
            type: "text",
            role: "user",
            content: `### Hosted cloud database (auto-provisioned)\n- Isolated Postgres schema name: ${hostedRow.postgresSchema}\n- DATABASE_URL is written to the sandbox .env.local — use process.env.DATABASE_URL in Route Handlers (Node runtime).\n- In each handler (or pooled client setup), run SET search_path TO ${hostedRow.postgresSchema} before SQL, or qualify tables as ${hostedRow.postgresSchema}.table_name.\n- Create durable tables with CREATE TABLE IF NOT EXISTS inside that schema (raw SQL via pg or @vercel/postgres; install via terminal if needed).\n- Client bridge for click-to-edit — append to app/layout.tsx inside <body>:\n  <script async src="${bridgeOrigin}/api/preview/bridge?parent=${enc}"></script>\n- Every major UI region must set data-dev-source="relative/path.tsx" on a wrapper.`,
          });
        }

        return {
          messages: [...contextHead, ...formattedMessages.reverse()],
          previousFiles,
          priorFileCount: Object.keys(previousFiles).length,
        };
      },
    );

    await step.run("progress-intent", async () => {
      const rid = event.data.runId;
      if (!rid) return;
      const baseDetail =
        previousContext.priorFileCount > 0
          ? `Loading ${previousContext.priorFileCount} existing project file(s) as context`
          : "Starting from a fresh sandbox";
      const hintP = quickAgentIntentLine(
        event.data.value,
        agentProvider,
        agentModelId,
      );
      await mergeRunProgress(rid, {
        phase: "intent",
        label: "Understanding your request",
        detail: baseDetail,
        pct: 5,
      });
      const hint = await hintP;
      if (hint) {
        await mergeRunProgress(rid, {
          detail: `${baseDetail} · ${hint}`,
          pct: 6,
        });
      }
    });

    if (event.data.runId) {
      await step.run("stream-ai-live", async () => {
        await streamAgentPreambleToProgress({
          runId: event.data.runId!,
          userText: agentUserMessage,
          provider: agentProvider,
          model: agentModelId,
        });
      });
    }

    await step.run("seed-sandbox-from-context", async () => {
      const entries = Object.entries(previousContext.previousFiles).filter(
        ([, c]) => typeof c === "string",
      ) as [string, string][];
      if (entries.length === 0) return;
      const sandbox = await getSandbox(sandboxId);
      for (const [path, content] of entries.slice(0, 120)) {
        try {
          await sandbox.files.write(path, content);
        } catch {
          // skip unreadable paths
        }
      }
    });

    const earlyPreviewUrl = await step.run("early-preview-url", async () => {
      await assertNotCancelled();
      const sandbox = await getSandbox(sandboxId);
      return `https://${sandbox.getHost(3000)}`;
    });

    if (event.data.runId) {
      await mergeRunProgress(event.data.runId, {
        previewSandboxUrl: earlyPreviewUrl,
        phase: "build",
        label: "Sandbox ready",
        detail: "Streaming file updates; preview refreshes as the dev server picks up changes.",
        pct: 12,
      });
    }

    const state = createState<AgentState>(
      {
        plan: '',
        architecture: '',
        summary: '',
        files: {},
      },
      {
        messages: previousContext.messages,
      },
    );

    const runId = event.data.runId;

    const plannerAgent = createAgent<AgentState>({
      name: 'planner-agent',
      description: 'Plans implementation tasks',
      system:
        'Create a concise build plan for this user request. Return only plan bullets.\n' +
        'If the user needs data, auth flows, or CRUD: explicitly call for Next.js Route Handlers under app/api/ and state whether persistence should use the hosted Postgres schema (when mentioned in context) or local mock/JSON.',
      model: buildCodeAgentModel(agentProvider, agentModelId, "planner"),
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const txt = lastAssistantTextMessageContent(result);
          if (txt && network) {
            network.state.data.plan = txt;
          }
          if (runId) {
            void mergeRunProgress(runId, {
              phase: "plan",
              label: "Planning",
              streamText: truncateStreamText(txt || ""),
              pct: 28,
            });
          }
          return result;
        },
      },
    });

    const architectAgent = createAgent<AgentState>({
      name: "architect-agent",
      description: "Designs module boundaries, routes, and data flow",
      system: `You are the system architect. Given state.plan, prior messages (including any "### Hosted cloud database" block), and the user goal, output a concise engineering design:
• Components / modules and responsibilities
• Server vs client boundaries (Next.js App Router — "use client" only where hooks/browser APIs are needed)
• Exact relative paths to add or edit (e.g. app/page.tsx, app/api/tasks/route.ts, app/lib/types.ts)
• Data layer (pick ONE strategy and stick to it):
  – If hosted Postgres schema is described in context: design real tables (CREATE TABLE IF NOT EXISTS schema_name.table_name), Route Handlers that run SET search_path TO schema_name then SQL via pg or @vercel/postgres (install via terminal if missing). Shared types mirrored in app/lib/types.ts. Never use Prisma in the sandbox.
  – If no hosted schema in context: Route Handlers with JSON + in-memory maps or data/*.json + fs (export runtime = 'nodejs' where fs is used). Same shared types pattern.
• Never reference Prisma, PlanetScale, or external DB SDKs unless the user explicitly asked and packages were installed via terminal.

No tools — plain text only.`,
      model: buildCodeAgentModel(agentProvider, agentModelId, "architect"),
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const txt = lastAssistantTextMessageContent(result);
          if (network) {
            network.state.data.architecture =
              txt?.trim() || "Follow the plan with minimal new files.";
          }
          if (runId) {
            void mergeRunProgress(runId, {
              phase: "architect",
              label: "Architecting solution",
              streamText: truncateStreamText(txt || ""),
              pct: 36,
            });
          }
          return result;
        },
      },
    });

    const sandboxFileTools = [
      createTool({
        name: "terminal",
        description: "Use the terminal to run commands",
        parameters: z.object({
          command: z.string(),
        }),
        handler: async ({ command }, { step }) => {
          return await step?.run("terminal", async () => {
            const buffers = {
              stdout: "",
              stderr: "",
            };

            try {
              const sandbox = await getSandbox(sandboxId);
              const result = await sandbox.commands.run(command, {
                onStdout: (data: string) => {
                  buffers.stdout += data;
                },
                onStderr: (data: string) => {
                  buffers.stderr += data;
                },
              });

              return result.stdout;
            } catch (error) {
              console.error(
                `command failed: ${error}\nstdOut: ${buffers.stdout}\nstdError: ${buffers.stderr}`,
              );
              return `command failed: ${error}\nstdOut: ${buffers.stdout}\nstdError: ${buffers.stderr}`;
            }
          });
        },
      }),
      createTool({
        name: "createOrUpdateFiles",
        description: "Create or update files in the sandbox",
        parameters: z.object({
          files: z.array(
            z.object({
              path: z.string(),
              content: z.string(),
            }),
          ),
        }),
        handler: async (
          { files },
          { step, network },
        ) => {
          const newFiles = await step?.run(
            "createOrUpdateFiles",
            async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);

                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              } catch (error) {
                return "Error: " + error;
              }
            },
          );

          if (typeof newFiles === "object") {
            network.state.data.files = newFiles;
            if (runId && Array.isArray(files)) {
              const paths = files.map((f) => f.path).filter(Boolean);
              const baseline = mergeFileCollections(
                previousContext.previousFiles,
                network.state.data.files || {},
              );
              const graph = buildProjectGraph(baseline);
              const expanded = expandPatchTargets(
                paths,
                baseline,
                graph,
              );
              const partialPreview: Record<string, string> = {};
              for (const f of files) partialPreview[f.path] = f.content;
              void mergeRunProgress(runId, {
                phase: "build",
                label: "Applying file patches",
                detail:
                  expanded.slice(0, 6).join(", ") +
                  (expanded.length > 6 ? "…" : ""),
                changedPaths: expanded.slice(0, 32),
                pct: 52,
                partialPreview,
                previewRevBump: true,
              });
            }
          }
        },
      }),
      createTool({
        name: "readFiles",
        description: "Read files from the sandbox",
        parameters: z.object({
          files: z.array(z.string()),
        }),
        handler: async ({ files }, { step }) => {
          return await step?.run("readFiles", async () => {
            try {
              const sandbox = await getSandbox(sandboxId);
              const contents = [];

              for (const file of files) {
                const content = await sandbox.files.read(file);
                contents.push({ path: file, content });
              }

              return JSON.stringify(contents);
            } catch (error) {
              return "Error: " + error;
            }
          });
        },
      }),
    ];

    const builderAgent = createAgent<AgentState>({
      name: "builder-agent",
      description: "Builds implementation in sandbox (generator role)",
      system: `${PROMPT}\n\nYou are the generator. Network state has state.plan and state.architecture — implement them; touch only required files. Add colocated *.test.ts using Vitest when logic is non-trivial.`,
      model: buildCodeAgentModel(agentProvider, agentModelId, "builder"),
      tools: sandboxFileTools,
      lifecycle: {
        onResponse: async ({ result, network }) => {
          touchRepairRound(network ?? undefined);
          const lastAssistantTextMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantTextMessageText && network) {
            if (lastAssistantTextMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantTextMessageText;
            }
          }
          if (runId) {
            void mergeRunProgress(runId, {
              phase: "build",
              label: "Building & iterating",
              streamText: truncateStreamText(
                lastAssistantTextMessageText || "",
              ),
              pct: 62,
            });
          }

          return result;
        },
      },
    });

    const fixerAgent = createAgent<AgentState>({
      name: "fixer-agent",
      description: "Repairs validation or lint failures with minimal diffs",
      system: FIXER_SYSTEM,
      model: buildCodeAgentModel(agentProvider, agentModelId, "fixer"),
      tools: sandboxFileTools,
      lifecycle: {
        onResponse: async ({ result, network }) => {
          touchRepairRound(network ?? undefined);
          const txt = lastAssistantTextMessageContent(result);
          if (txt && network?.state.data && txt.includes("<task_summary>")) {
            network.state.data.summary = txt;
          }
          if (runId) {
            void mergeRunProgress(runId, {
              phase: "fix",
              label: "Auto-fix pass",
              streamText: truncateStreamText(txt || ""),
              pct: 72,
            });
          }
          return result;
        },
      },
    });

    const reviewerAgent = createAgent<AgentState>({
      name: 'reviewer-agent',
      description: 'Reviews output and enforces summary format',
      system:
        'Review the generated result. Produce a short <task_summary> with shipped outcomes and key files.',
      model: buildCodeAgentModel(agentProvider, agentModelId, "reviewer"),
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const txt = lastAssistantTextMessageContent(result);
          if (txt && network) {
            network.state.data.summary = txt.includes('<task_summary>')
              ? txt
              : `<task_summary>\n${txt}\n</task_summary>`;
          }
          if (runId) {
            void mergeRunProgress(runId, {
              phase: "review",
              label: "Review & finalize",
              streamText: truncateStreamText(txt || ""),
              pct: 82,
            });
          }
          return result;
        },
      },
    });

    const buildNetwork = () =>
      createNetwork<AgentState>({
        name: "coding-agent-network",
        agents: [
          plannerAgent,
          architectAgent,
          builderAgent,
          fixerAgent,
          reviewerAgent,
        ],
        maxIter: MAX_NETWORK_ITER,
        defaultState: state,
        router: async ({ network }) => {
          const { plan, summary, architecture } = network.state.data;
          if (summary) {
            return;
          }

          if (!plan) {
            return plannerAgent;
          }

          if (!architecture?.trim()) {
            return architectAgent;
          }

          const rounds = network.state.data.bypassReviewerRounds ?? 0;
          if (rounds > 0) {
            return fixerAgent;
          }

          if (Object.keys(network.state.data.files || {}).length === 0) {
            return builderAgent;
          }

          return reviewerAgent;
        },
      });

    try {
      let result: Awaited<ReturnType<ReturnType<typeof buildNetwork>["run"]>> | null =
        null;
      let attempt = 0;
      while (attempt <= MAX_RETRIES && !result) {
        await assertNotCancelled();
        try {
          const net = buildNetwork();
          result = await withTimeout(
            net.run(agentUserMessage, { state }),
            RUN_TIMEOUT_MS,
          );
        } catch (error) {
          attempt += 1;
          if (attempt > MAX_RETRIES) {
            throw error;
          }
          log({
            level: "warn",
            message: "Retrying AI run after failure",
            projectId: event.data.projectId,
            runId: event.data.runId,
            code: ERROR_CODES.RUN_TIMEOUT,
            error,
            meta: { attempt },
          });
        }
      }

      if (!result) {
        throw new Error("No result produced");
      }

      const getMergedFiles = () => {
        if (!result) {
          throw new Error("Internal: agent result missing");
        }
        return mergeFileCollections(
          previousContext.previousFiles,
          result.state.data.files || {},
        );
      };

      let parsed = safeParseAgentOutput({
        summary: result.state.data.summary || "",
        files: getMergedFiles(),
      });

      if (!parsed.ok) {
        log({
          level: "warn",
          message: "Agent output failed contract validation",
          projectId: event.data.projectId,
          runId: event.data.runId,
          code: ERROR_CODES.INNGEST_DISPATCH_FAILED,
          error: new Error(parsed.errorText),
        });
      }

      let validationErrorText = parsed.ok ? "" : parsed.errorText;

      if (!parsed.ok && runId) {
        let fixPass = 0;
        while (!parsed.ok && fixPass < VALIDATION_FIX_PASSES) {
          fixPass += 1;
          await mergeRunProgress(runId, {
            phase: "fix",
            label: `Contract fix ${fixPass}/${VALIDATION_FIX_PASSES}`,
            detail: truncateStreamText(validationErrorText),
            pct: 82 + fixPass,
            iteration: fixPass,
          });
          result.state.data.summary = "";
          result.state.data.bypassReviewerRounds = FIXER_CODE_ROUNDS;
          const networkFix = buildNetwork();
          result = await withTimeout(
            networkFix.run(
              `${agentUserMessage}\n\n[System: Contract validation failed. Apply minimal patches only.\n${validationErrorText}\nYou MUST output valid <task_summary>...</task_summary> and at least one file via createOrUpdateFiles.]`,
              { state: result.state },
            ),
            RUN_TIMEOUT_MS,
          );
          parsed = safeParseAgentOutput({
            summary: result.state.data.summary || "",
            files: getMergedFiles(),
          });
          validationErrorText = parsed.ok ? "" : parsed.errorText;
        }
      }

      if (!parsed.ok) {
        if (runId) {
          await mergeRunProgress(runId, {
            phase: "fix",
            label: "Full rebuild fallback",
            detail: "Patch attempts exhausted — regenerating a minimal app",
            pct: 91,
          });
        }
        const freshState = createState<AgentState>(
          {
            plan: "",
            architecture: "",
            summary: "",
            files: {},
            bypassReviewerRounds: 0,
          },
          { messages: previousContext.messages },
        );
        const net = buildNetwork();
        result = await withTimeout(
          net.run(
            `${agentUserMessage}\n\n[System: FULL REBUILD. Discard partial output. Produce a minimal working Next.js app with valid task_summary and files.]`,
            { state: freshState },
          ),
          RUN_TIMEOUT_MS,
        );
        parsed = safeParseAgentOutput({
          summary: result.state.data.summary || "",
          files: getMergedFiles(),
        });
      }

      let validatedOutput = parsed.ok ? parsed.data : null;

      if (validatedOutput && runId) {
        let lintCheck = await step.run("lint-verify-0", async () => {
          await assertNotCancelled();
          const sandbox = await getSandbox(sandboxId);
          return sandboxLintVerify(sandbox);
        });
        let lintFixes = 0;
        while (!lintCheck.ok && lintFixes < LINT_FIX_PASSES) {
          lintFixes += 1;
          await mergeRunProgress(runId, {
            phase: "fix",
            label: `Lint auto-fix ${lintFixes}/${LINT_FIX_PASSES}`,
            detail: "next lint reported issues — repairing",
            lastVerifyLog: lintCheck.log.slice(0, 2500),
            pct: 88 + lintFixes,
            iteration: 20 + lintFixes,
          });
          result.state.data.summary = "";
          result.state.data.bypassReviewerRounds = FIXER_CODE_ROUNDS;
          result = await withTimeout(
            buildNetwork().run(
              `${agentUserMessage}\n\n[System: next lint / static check failed. Minimal patches only; do not rewrite unrelated modules.\n---\n${lintCheck.log.slice(0, 9000)}\n---]`,
              { state: result.state },
            ),
            RUN_TIMEOUT_MS,
          );
          const lp = safeParseAgentOutput({
            summary: result.state.data.summary || "",
            files: getMergedFiles(),
          });
          if (!lp.ok) {
            validatedOutput = null;
            lintCheck = { ok: true, log: "" };
            break;
          }
          validatedOutput = lp.data;
          lintCheck = await step.run(`lint-verify-${lintFixes}`, async () => {
            await assertNotCancelled();
            const sandbox = await getSandbox(sandboxId);
            return sandboxLintVerify(sandbox);
          });
        }
        if (!lintCheck.ok && validatedOutput) {
          log({
            level: "warn",
            message: "Lint still failing after auto-fix attempts; continuing",
            projectId: event.data.projectId,
            runId: event.data.runId,
          });
        }
      }

      if (validatedOutput && runId) {
        let testCheck = await step.run("test-run-0", async () => {
          await assertNotCancelled();
          const sandbox = await getSandbox(sandboxId);
          return sandboxRunTests(sandbox);
        });
        let testFixes = 0;
        while (!testCheck.ok && testFixes < TEST_FIX_PASSES) {
          testFixes += 1;
          await mergeRunProgress(runId, {
            phase: "test",
            label: `Tests ${testFixes}/${TEST_FIX_PASSES}`,
            detail: "Automated test run — hardening code",
            lastVerifyLog: testCheck.log.slice(0, 2500),
            pct: 90 + testFixes,
            iteration: 40 + testFixes,
          });
          result.state.data.summary = "";
          result.state.data.bypassReviewerRounds = FIXER_CODE_ROUNDS;
          result = await withTimeout(
            buildNetwork().run(
              `${agentUserMessage}\n\n[System: Automated tests failed. Fix minimally; keep tests green.\n---\n${testCheck.log.slice(0, 9000)}\n---]`,
              { state: result.state },
            ),
            RUN_TIMEOUT_MS,
          );
          const tp = safeParseAgentOutput({
            summary: result.state.data.summary || "",
            files: getMergedFiles(),
          });
          if (!tp.ok) {
            validatedOutput = null;
            testCheck = { ok: true, log: "" };
            break;
          }
          validatedOutput = tp.data;
          testCheck = await step.run(`test-run-${testFixes}`, async () => {
            await assertNotCancelled();
            const sandbox = await getSandbox(sandboxId);
            return sandboxRunTests(sandbox);
          });
        }
        if (!testCheck.ok && validatedOutput) {
          log({
            level: "warn",
            message: "Tests still failing after auto-fix; continuing with lint-valid output",
            projectId: event.data.projectId,
            runId: event.data.runId,
          });
        }
      }

      const isError = !validatedOutput;

      if (runId && !isError) {
        await step.run("progress-finalize", async () => {
          await mergeRunProgress(runId, {
            phase: "finalize",
            label: "Preparing live preview",
            pct: 93,
          });
        });
      }

      const sandboxUrl = await step.run('get-sandbox-url', async () => {
        await assertNotCancelled();
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        return `https://${host}`;
      });

      await step.run('save-result', async () => {
        if (isError || !validatedOutput) {
          await prisma.jobRun.updateMany({
            where: { id: event.data.runId },
            data: {
              status: 'FAILED',
              errorCode: ERROR_CODES.RUN_TIMEOUT,
              errorMessage: 'No summary/files produced',
              finishedAt: new Date(),
              summary: result.state.data.summary || null,
            },
          });
          if (event.data.runId) {
            await clearRunProgress(event.data.runId);
          }

          return await prisma.message.create({
            data: {
              projectId: event.data.projectId,
              content: 'Something went wrong. Please try again.',
              role: 'ASSISTANT',
              type: 'ERROR',
              runStatus: 'FAILED',
              runId: event.data.runId,
            },
          });
        }

        const safeOutput = validatedOutput;
        await prisma.jobRun.updateMany({
          where: { id: event.data.runId },
          data: {
            status: 'SUCCEEDED',
            summary: safeOutput.summary,
            finishedAt: new Date(),
          },
        });
        if (event.data.runId) {
          await clearRunProgress(event.data.runId);
        }

        const hostedSnap = await prisma.hostedProjectEnvironment.findUnique({
          where: { projectId: event.data.projectId },
        });
        const persistentSeed =
          hostedSnap?.persistentPreviewUrl ||
          env.VERCEL_PRODUCTION_URL ||
          env.HOSTED_FALLBACK_PREVIEW_URL ||
          null;

        const createdMsg = await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: summaryToUserMessage(safeOutput.summary),
            role: 'ASSISTANT',
            type: 'RESULT',
            runStatus: 'SUCCEEDED',
            runId: event.data.runId,
            fragment: {
              create: {
                sandboxUrl,
                persistentPreviewUrl: persistentSeed || undefined,
                title: deriveTitle(safeOutput.summary),
                files: safeOutput.files,
              },
            },
          },
          include: { fragment: true },
        });

        const { hookTriggered, deploymentUrl } =
          await runAutoCloudPreviewPipeline();
        let cloudPersistent = deploymentUrl;
        if (hookTriggered) {
          cloudPersistent =
            (await pollLatestReadyDeploymentUrl()) || cloudPersistent;
        } else if (!cloudPersistent) {
          cloudPersistent = await fetchLatestReadyDeploymentUrl();
        }
        const finalPersistent =
          cloudPersistent ||
          persistentSeed ||
          env.VERCEL_PRODUCTION_URL ||
          env.HOSTED_FALLBACK_PREVIEW_URL ||
          null;

        if (finalPersistent && createdMsg.fragment?.id) {
          await prisma.fragment.update({
            where: { id: createdMsg.fragment.id },
            data: { persistentPreviewUrl: finalPersistent },
          });
          await prisma.hostedProjectEnvironment.updateMany({
            where: { projectId: event.data.projectId },
            data: { persistentPreviewUrl: finalPersistent },
          });
        }

        await prisma.projectSnapshot.create({
          data: {
            projectId: event.data.projectId,
            label: deriveTitle(safeOutput.summary).slice(0, 200),
            files: safeOutput.files as object,
            sandboxUrl,
            sourceRunId: event.data.runId ?? undefined,
            summaryLine: summaryToUserMessage(safeOutput.summary).slice(0, 500),
          },
        });

        await prisma.projectMemory.upsert({
          where: {
            projectId_key: {
              projectId: event.data.projectId,
              key: "last_success_summary",
            },
          },
          create: {
            projectId: event.data.projectId,
            key: "last_success_summary",
            value: summaryToUserMessage(safeOutput.summary),
          },
          update: {
            value: summaryToUserMessage(safeOutput.summary),
          },
        });

        await prisma.projectMemory.upsert({
          where: {
            projectId_key: {
              projectId: event.data.projectId,
              key: "last_touched_paths",
            },
          },
          create: {
            projectId: event.data.projectId,
            key: "last_touched_paths",
            value: Object.keys(safeOutput.files).slice(0, 120),
          },
          update: {
            value: Object.keys(safeOutput.files).slice(0, 120),
          },
        });

        return createdMsg;
      });

      await step.run('mark-user-message-succeeded', async () => {
        await prisma.message.updateMany({
          where: {
            runId: event.data.runId,
            role: "USER",
          },
          data: {
            runStatus: "SUCCEEDED",
          },
        });
      });

      await step.run('record-prompt-metric-success', async () => {
        await prisma.promptMetric.create({
          data: {
            runId: event.data.runId,
            promptVersion,
            model: `${agentProvider}:${agentModelId}`,
            status: 'SUCCEEDED',
            latencyMs: Date.now() - startedAtMs,
          },
        });
      });

      log({
        level: "info",
        message: "AI run completed",
        projectId: event.data.projectId,
        runId: event.data.runId,
        meta: { latencyMs: Date.now() - startedAtMs },
      });

      return {
        url: sandboxUrl,
        title: 'Fragment',
        files: validatedOutput!.files,
        summary: validatedOutput!.summary,
      };
    } catch (error) {
      log({
        level: 'error',
        message: 'Inngest code-agent function failed',
        projectId: event.data.projectId,
        runId: event.data.runId,
        code:
          error instanceof Error && error.message.includes("timeout")
            ? ERROR_CODES.RUN_TIMEOUT
            : ERROR_CODES.INNGEST_DISPATCH_FAILED,
        error,
      });

      await step.run('mark-run-failed', async () => {
        await prisma.jobRun.updateMany({
          where: { id: event.data.runId },
          data: {
            status: 'FAILED',
            errorCode:
              error instanceof Error && error.message.includes("timeout")
                ? ERROR_CODES.RUN_TIMEOUT
                : ERROR_CODES.INNGEST_DISPATCH_FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            finishedAt: new Date(),
          },
        });
        if (event.data.runId) {
          await clearRunProgress(event.data.runId);
        }
      });

      await step.run('mark-user-message-failed', async () => {
        await prisma.message.updateMany({
          where: {
            runId: event.data.runId,
            role: "USER",
          },
          data: {
            runStatus: "FAILED",
          },
        });
      });

      await step.run('save-failure-message', async () => {
        await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: 'Generation failed. Please try again.',
            role: 'ASSISTANT',
            type: 'ERROR',
            runStatus: 'FAILED',
            runId: event.data.runId,
          },
        });
      });

      await step.run('record-prompt-metric-failure', async () => {
        await prisma.promptMetric.create({
          data: {
            runId: event.data.runId,
            promptVersion,
            model: `${agentProvider}:${agentModelId}`,
            status: 'FAILED',
            latencyMs: Date.now() - startedAtMs,
          },
        });
      });

      throw error;
    } finally {
      await step.run("cleanup-sandbox", async () => {
        await cleanupSandbox(sandboxId);
      });
    }
  },
);
