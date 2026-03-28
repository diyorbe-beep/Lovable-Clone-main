export const CODE_AGENT_PROVIDERS = ["gemini", "openai", "anthropic"] as const;
export type CodeAgentProviderId = (typeof CODE_AGENT_PROVIDERS)[number];

export const CODE_AGENT_PRESETS = [
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "gemini" as const,
    model: "gemini-2.0-flash",
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "gemini" as const,
    model: "gemini-1.5-pro",
  },
  {
    id: "gpt-4o-mini",
    label: "OpenAI GPT-4o mini",
    provider: "openai" as const,
    model: "gpt-4o-mini",
  },
  {
    id: "gpt-4o",
    label: "OpenAI GPT-4o",
    provider: "openai" as const,
    model: "gpt-4o",
  },
  {
    id: "claude-haiku",
    label: "Claude 3.5 Haiku",
    provider: "anthropic" as const,
    model: "claude-3-5-haiku-latest",
  },
  {
    id: "claude-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic" as const,
    model: "claude-3-5-sonnet-latest",
  },
] as const;

export type CodeAgentPresetId = (typeof CODE_AGENT_PRESETS)[number]["id"];

export function getCodeAgentPresetById(
  id: string,
): (typeof CODE_AGENT_PRESETS)[number] | undefined {
  return CODE_AGENT_PRESETS.find((p) => p.id === id);
}
