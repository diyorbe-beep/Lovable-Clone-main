import { anthropic, gemini, openai } from "@inngest/agent-kit";

import type { CodeAgentProviderId } from "@/constants/agent-code";

export type CodeAgentModelKind =
  | "planner"
  | "architect"
  | "builder"
  | "fixer"
  | "reviewer";

const KIND_TEMPERATURE: Record<CodeAgentModelKind, number> = {
  planner: 0.1,
  architect: 0.12,
  builder: 0.1,
  fixer: 0.05,
  reviewer: 0.1,
};

/**
 * Maps UI/env model + provider to Inngest Agent Kit adapters (tools + multi-turn).
 */
export function buildCodeAgentModel(
  provider: CodeAgentProviderId,
  modelId: string,
  kind: CodeAgentModelKind,
) {
  const temperature = KIND_TEMPERATURE[kind];

  switch (provider) {
    case "openai":
      return openai({
        model: modelId,
        defaultParameters: { temperature },
      });
    case "anthropic":
      return anthropic({
        model: modelId,
        defaultParameters: { max_tokens: 8192, temperature },
      });
    case "gemini":
    default:
      return gemini({
        model: modelId,
        defaultParameters: {
          generationConfig: { temperature },
        },
      });
  }
}
