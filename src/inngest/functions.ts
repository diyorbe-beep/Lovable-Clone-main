import { Sandbox } from '@e2b/code-interpreter';
import {
  createAgent,
  createNetwork,
  createState,
  createTool,
  type Message,
  gemini,
  type Tool,
} from '@inngest/agent-kit';
import { z } from 'zod';

import { env } from '@/config/env';
import { ERROR_CODES } from '@/lib/errors';
import { validateAgentOutput } from '@/lib/agent-output';
import { log } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { PROMPT } from '@/prompt';
import { FileCollection } from '@/types';
import { inngest } from './client';
import {
  cleanupSandbox,
  getSandbox,
  lastAssistantTextMessageContent,
} from './utils';
import { SANDBOX_TIMEOUT_IN_MS } from '@/constants';

interface AgentState {
  plan: string;
  summary: string;
  files: FileCollection;
}

/** Faqat 1 marta to‘liq AI tarmog‘i (qayta urinishsiz — uzoq “Generating” kamayadi) */
const MAX_RETRIES = 0;
const RUN_TIMEOUT_MS = 3 * 60 * 1000;
const SANDBOX_CREATE_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_NETWORK_ITER = 8;

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

export const codeAgentFunction = inngest.createFunction(
  { id: 'code-agent' },
  { event: 'code-agent/run' },
  async ({ event, step }) => {
    const startedAtMs = Date.now();
    const promptVersion = 'v2-planner-builder-reviewer';
    log({
      level: "info",
      message: "AI run started",
      projectId: event.data.projectId,
      runId: event.data.runId,
      meta: { promptVersion },
    });

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
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY && !env.GOOGLE_API_KEY) {
        throw new Error(
          'Gemini API key missing. Set GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY) in .env.local.',
        );
      }

      const sandbox = await withTimeout(
        Sandbox.create('vibe-nextjs-bek-2'),
        SANDBOX_CREATE_TIMEOUT_MS,
      );
      await sandbox.setTimeout(SANDBOX_TIMEOUT_IN_MS);
      return sandbox.sandboxId;
    });

    const previousMessages = await step.run(
      'get-previous-messages',
      async () => {
        const formattedMessages: Message[] = [];

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

        return formattedMessages.reverse();
      },
    );

    const state = createState<AgentState>(
      {
        plan: '',
        summary: '',
        files: {},
      },
      {
        messages: previousMessages,
      },
    );

    const plannerAgent = createAgent<AgentState>({
      name: 'planner-agent',
      description: 'Plans implementation tasks',
      system:
        'Create a concise build plan for this user request. Return only plan bullets.',
      model: gemini({
        model: 'gemini-2.0-flash',
        defaultParameters: {
          generationConfig: { temperature: 0.1 },
        },
      }),
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const txt = lastAssistantTextMessageContent(result);
          if (txt && network) {
            network.state.data.plan = txt;
          }
          return result;
        },
      },
    });

    const codeAgent = createAgent<AgentState>({
      name: 'builder-agent',
      description: 'Builds implementation in sandbox',
      system: `${PROMPT}\n\nYou are given a plan in state.plan. Follow it precisely.`,
      model: gemini({
        model: 'gemini-2.0-flash',
        defaultParameters: {
          generationConfig: { temperature: 0.1 },
        },
      }),
      tools: [
        createTool({
          name: 'terminal',
          description: 'Use the terminal to run commands',
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run('terminal', async () => {
              const buffers = {
                stdout: '',
                stderr: '',
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
          name: 'createOrUpdateFiles',
          description: 'Create or update files in the sandbox',
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
            { step, network }: Tool.Options<AgentState>,
          ) => {
            const newFiles = await step?.run(
              'createOrUpdateFiles',
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
                  return 'Error: ' + error;
                }
              },
            );

            if (typeof newFiles === 'object') {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: 'readFiles',
          description: 'Read files from the sandbox',
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run('readFiles', async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];

                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return 'Error: ' + error;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantTextMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantTextMessageText && network) {
            if (lastAssistantTextMessageText.includes('<task_summary>')) {
              network.state.data.summary = lastAssistantTextMessageText;
            }
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
      model: gemini({
        model: 'gemini-2.0-flash',
        defaultParameters: {
          generationConfig: { temperature: 0.1 },
        },
      }),
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const txt = lastAssistantTextMessageContent(result);
          if (txt && network) {
            network.state.data.summary = txt.includes('<task_summary>')
              ? txt
              : `<task_summary>\n${txt}\n</task_summary>`;
          }
          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: 'coding-agent-network',
      agents: [plannerAgent, codeAgent, reviewerAgent],
      maxIter: MAX_NETWORK_ITER,
      defaultState: state,
      router: async ({ network }) => {
        const { plan, summary } = network.state.data;

        if (summary) {
          return;
        }

        if (!plan) {
          return plannerAgent;
        }

        if (Object.keys(network.state.data.files || {}).length === 0) {
          return codeAgent;
        }

        return reviewerAgent;
      },
    });

    try {
      let result: Awaited<ReturnType<typeof network.run>> | null = null;
      let attempt = 0;
      while (attempt <= MAX_RETRIES && !result) {
        await assertNotCancelled();
        try {
          result = await withTimeout(
            network.run(event.data.value, { state }),
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

      let validatedOutput:
        | ReturnType<typeof validateAgentOutput>
        | null = null;
      try {
        validatedOutput = validateAgentOutput({
          summary: result.state.data.summary || "",
          files: result.state.data.files || {},
        });
      } catch (validationError) {
        log({
          level: "warn",
          message: "Agent output failed contract validation",
          projectId: event.data.projectId,
          runId: event.data.runId,
          code: ERROR_CODES.INNGEST_DISPATCH_FAILED,
          error: validationError,
        });
      }

      const isError = !validatedOutput;

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

        return await prisma.message.create({
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
                title: deriveTitle(safeOutput.summary),
                files: safeOutput.files,
              },
            },
          },
        });
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
            model: 'gemini-2.0-flash',
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
            model: 'gemini-2.0-flash',
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
