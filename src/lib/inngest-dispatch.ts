import { inngest } from "@/inngest/client";
import { env } from "@/config/env";

import type { CodeAgentProviderId } from "@/constants/agent-code";
import { getDefaultCodeAgentRouting } from "@/lib/agent/code-agent-routing";
import type { FileCollection } from "@/types";

export type DispatchPayload = {
  value: string;
  projectId: string;
  runId: string;
  userId: string;
  requestId: string;
  runMode?: "debug";
  visualTarget?: { path: string; selector?: string };
  previousFilesOverride?: FileCollection;
  /** When both set, overrides env default routing for this run */
  agentProvider?: CodeAgentProviderId;
  agentModel?: string;
};

async function isLocalInngestReachable() {
  try {
    const response = await fetch("http://127.0.0.1:8288/health", {
      method: "GET",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function dispatchCodeAgentRun(data: DispatchPayload) {
  if (env.INNGEST_DEV === "1") {
    const reachable = await isLocalInngestReachable();
    if (!reachable) {
      throw new Error(
        "Inngest dev server is not running on http://localhost:8288. Start it with: npx inngest-cli@latest dev -u http://localhost:3008/api/inngest",
      );
    }
  }

  const preset =
    data.agentProvider &&
    typeof data.agentModel === "string" &&
    data.agentModel.trim()
      ? {
          provider: data.agentProvider,
          model: data.agentModel.trim(),
        }
      : getDefaultCodeAgentRouting();

  await inngest.send({
    name: "code-agent/run",
    data: {
      ...data,
      provider: preset.provider,
      model: preset.model,
    } as Record<string, unknown>,
  });
}
