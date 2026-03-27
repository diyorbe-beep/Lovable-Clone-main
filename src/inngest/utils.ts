import { SANDBOX_TIMEOUT_IN_MS } from "@/constants";
import { Sandbox } from "@e2b/code-interpreter";
import { AgentResult, type Message, TextMessage } from "@inngest/agent-kit";

export async function getSandbox(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);
  await sandbox.setTimeout(SANDBOX_TIMEOUT_IN_MS); // half hour

  return sandbox;
}

export async function cleanupSandbox(sandboxId?: string) {
  if (!sandboxId) return;
  try {
    const sandbox = await Sandbox.connect(sandboxId);
    const maybe = sandbox as unknown as {
      close?: () => Promise<void>;
      kill?: () => Promise<void>;
    };
    if (typeof maybe.kill === "function") {
      await maybe.kill();
      return;
    }
    if (typeof maybe.close === "function") {
      await maybe.close();
    }
  } catch {
    // best-effort cleanup
  }
}

export function lastAssistantTextMessageContent(result: AgentResult) {
  const lastAssistantTextMessageIndex = result.output.findLastIndex(
    (message) => message.role === "assistant"
  );

  const message = result.output[lastAssistantTextMessageIndex] as
    | TextMessage
    | undefined;

  if (!message?.content) {
    return undefined;
  }

  return typeof message.content === "string"
    ? message.content
    : message.content.map((c) => c.text).join("");
}

export function parseAgentOutput(value: Message[]) {
  const output = value[0];

  if (output.type !== "text") {
    return "Fragment";
  }

  if (Array.isArray(output.content)) {
    return output.content.map((txt) => txt).join("");
  } else {
    return output.content;
  }
}
