import { env } from "@/config/env";
import type { CodeAgentProviderId } from "@/constants/agent-code";
import { streamGeminiPreambleToProgress } from "@/lib/ai/gemini-stream-progress";
import {
  mergeRunProgress,
  truncateStreamText,
} from "@/lib/run-progress";

const THROTTLE_MS = 120;

const buildPrompt = (userText: string) =>
  `You are explaining to an engineer what you will do next (max 6 short sentences). User request:\n${userText.slice(0, 6000)}`;

/** Live “thinking” stream for progress UI — best-effort per provider. */
export async function streamAgentPreambleToProgress(params: {
  runId: string;
  userText: string;
  provider: CodeAgentProviderId;
  model: string;
}) {
  if (params.provider === "gemini") {
    await streamGeminiPreambleToProgress({
      runId: params.runId,
      userText: params.userText,
      model: params.model,
    });
    return;
  }

  const prompt = buildPrompt(params.userText);
  let acc = "";
  let lastFlush = 0;
  const flush = async () => {
    await mergeRunProgress(params.runId, {
      phase: "intent",
      label: "AI thinking (live)",
      streamText: truncateStreamText(acc),
      pct: 7,
    });
  };

  if (params.provider === "openai" && env.OPENAI_API_KEY?.trim()) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: params.model,
          stream: true,
          max_tokens: 800,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error("OpenAI stream failed");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const s = line.replace(/^\s*data:\s*/, "").trim();
          if (s === "[DONE]") continue;
          if (!s.startsWith("{")) continue;
          try {
            const json = JSON.parse(s) as {
              choices?: { delta?: { content?: string } }[];
            };
            const piece = json.choices?.[0]?.delta?.content ?? "";
            if (piece) {
              acc += piece;
              const now = Date.now();
              if (now - lastFlush >= THROTTLE_MS) {
                lastFlush = now;
                await flush();
              }
            }
          } catch {
            /* skip partial JSON */
          }
        }
      }
      await flush();
    } catch {
      await mergeRunProgress(params.runId, {
        phase: "intent",
        label: "Understanding your request",
        pct: 8,
      });
    }
    return;
  }

  if (params.provider === "anthropic" && env.ANTHROPIC_API_KEY?.trim()) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: 800,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error("Anthropic preamble failed");
      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text =
        data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
      acc = text;
      await flush();
    } catch {
      await mergeRunProgress(params.runId, {
        phase: "intent",
        label: "Understanding your request",
        pct: 8,
      });
    }
    return;
  }

  await mergeRunProgress(params.runId, {
    phase: "intent",
    label: "Understanding your request",
    pct: 8,
  });
}
