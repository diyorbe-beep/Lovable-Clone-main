import { env } from "@/config/env";
import type { CodeAgentProviderId } from "@/constants/agent-code";

const buildPrompt = (userText: string) =>
  `You are assisting a coding agent. The user attached a screenshot of a UI. Describe for implementation: layout, components, visible text, colors, spacing issues, and how it relates to the request. If something is unclear, say so. Max ~320 words, English.\n\nUser request:\n${userText.slice(0, 8000)}`;

async function visionGemini(
  userText: string,
  mimeType: string,
  base64: string,
  model: string,
): Promise<string | null> {
  const key = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY;
  if (!key?.trim()) return null;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(userText) },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(key)}`;
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
  return text?.length ? text : null;
}

async function visionOpenAI(
  userText: string,
  mimeType: string,
  base64: string,
  model: string,
): Promise<string | null> {
  if (!env.OPENAI_API_KEY?.trim()) return null;
  const url = `data:${mimeType};base64,${base64}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(userText) },
            { type: "image_url", image_url: { url } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text?.length ? text : null;
}

async function visionAnthropic(
  userText: string,
  mimeType: string,
  base64: string,
  model: string,
): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY?.trim()) return null;
  const media =
    mimeType === "image/png"
      ? ("image/png" as const)
      : mimeType === "image/webp"
        ? ("image/webp" as const)
        : ("image/jpeg" as const);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: media,
                data: base64,
              },
            },
            { type: "text", text: buildPrompt(userText) },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text =
    data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  return text.length ? text : null;
}

/**
 * Turn screenshot + user text into prose the code agent can use (no binary in the agent network).
 */
export async function extractVisualContextFromImage(params: {
  provider: CodeAgentProviderId;
  model: string;
  userText: string;
  mimeType: string;
  base64: string;
}): Promise<string | null> {
  const { userText, mimeType, base64, provider, model } = params;

  let out: string | null = null;
  if (provider === "gemini") {
    out = await visionGemini(userText, mimeType, base64, model);
  } else if (provider === "openai") {
    out = await visionOpenAI(userText, mimeType, base64, model);
  } else if (provider === "anthropic") {
    out = await visionAnthropic(userText, mimeType, base64, model);
  }

  if (out) return out;

  if (env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY) {
    const m =
      env.AGENT_GEMINI_MODEL ?? env.CODE_AGENT_MODEL ?? "gemini-2.0-flash";
    out = await visionGemini(userText, mimeType, base64, m);
    if (out) return out;
  }
  if (env.OPENAI_API_KEY) {
    out = await visionOpenAI(userText, mimeType, base64, "gpt-4o-mini");
    if (out) return out;
  }
  if (env.ANTHROPIC_API_KEY) {
    out = await visionAnthropic(
      userText,
      mimeType,
      base64,
      "claude-3-5-haiku-latest",
    );
  }
  return out;
}
