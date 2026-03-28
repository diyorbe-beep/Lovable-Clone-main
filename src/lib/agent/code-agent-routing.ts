import { env } from "@/config/env";
import type { CodeAgentProviderId } from "@/constants/agent-code";

export function getDefaultCodeAgentRouting(): {
  provider: CodeAgentProviderId;
  model: string;
} {
  const explicit = env.CODE_AGENT_PROVIDER;
  if (explicit === "openai") {
    return {
      provider: "openai",
      model: env.CODE_AGENT_MODEL ?? "gpt-4o-mini",
    };
  }
  if (explicit === "anthropic") {
    return {
      provider: "anthropic",
      model: env.CODE_AGENT_MODEL ?? "claude-3-5-haiku-latest",
    };
  }
  if (explicit === "gemini") {
    return {
      provider: "gemini",
      model:
        env.CODE_AGENT_MODEL ??
        env.AGENT_GEMINI_MODEL ??
        "gemini-2.0-flash",
    };
  }

  if (
    env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    env.GOOGLE_API_KEY?.trim()
  ) {
    return {
      provider: "gemini",
      model:
        env.CODE_AGENT_MODEL ??
        env.AGENT_GEMINI_MODEL ??
        "gemini-2.0-flash",
    };
  }
  if (env.OPENAI_API_KEY?.trim()) {
    return {
      provider: "openai",
      model: env.CODE_AGENT_MODEL ?? "gpt-4o-mini",
    };
  }
  if (env.ANTHROPIC_API_KEY?.trim()) {
    return {
      provider: "anthropic",
      model: env.CODE_AGENT_MODEL ?? "claude-3-5-haiku-latest",
    };
  }

  return {
    provider: "gemini",
    model:
      env.AGENT_GEMINI_MODEL ?? env.CODE_AGENT_MODEL ?? "gemini-2.0-flash",
  };
}

export function normalizeCodeAgentProvider(
  value: unknown,
): CodeAgentProviderId | null {
  if (value === "openai" || value === "anthropic" || value === "gemini") {
    return value;
  }
  return null;
}
