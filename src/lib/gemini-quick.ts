import { env } from "@/config/env";
import type { CodeAgentProviderId } from "@/constants/agent-code";

const intentUserPrompt = (userRequest: string) =>
  `In ONE short English sentence (max 18 words), what is the user trying to build? Output only that sentence, no quotes.\n\n---\n${userRequest.slice(0, 2800)}`;

async function intentGemini(
  userRequest: string,
  model: string,
): Promise<string | null> {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: intentUserPrompt(userRequest) }],
      },
    ],
    generationConfig: { maxOutputTokens: 80, temperature: 0.15 },
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    return text.replace(/^["']|["']$/g, "").slice(0, 220);
  } catch {
    return null;
  }
}

async function intentOpenAI(
  userRequest: string,
  model: string,
): Promise<string | null> {
  if (!env.OPENAI_API_KEY?.trim()) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 80,
        temperature: 0.15,
        messages: [{ role: "user", content: intentUserPrompt(userRequest) }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text.replace(/^["']|["']$/g, "").slice(0, 220);
  } catch {
    return null;
  }
}

async function intentAnthropic(
  userRequest: string,
  model: string,
): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY?.trim()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        temperature: 0.15,
        messages: [
          { role: "user", content: intentUserPrompt(userRequest) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    if (!text) return null;
    return text.replace(/^["']|["']$/g, "").slice(0, 220);
  } catch {
    return null;
  }
}

/** Tiny parallel call for UX — one-line “what we’re building”; failures are silent. */
export async function quickAgentIntentLine(
  userRequest: string,
  provider: CodeAgentProviderId,
  model: string,
): Promise<string | null> {
  if (!userRequest.trim()) return null;
  switch (provider) {
    case "openai":
      return intentOpenAI(userRequest, model);
    case "anthropic":
      return intentAnthropic(userRequest, model);
    case "gemini":
    default:
      return intentGemini(userRequest, model);
  }
}

/** @deprecated Use quickAgentIntentLine with explicit provider */
export async function quickIntentLine(
  userRequest: string,
  model: string,
): Promise<string | null> {
  return quickAgentIntentLine(userRequest, "gemini", model);
}
