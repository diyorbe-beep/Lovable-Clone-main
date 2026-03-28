import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "@/config/env";
import {
  mergeRunProgress,
  truncateStreamText,
} from "@/lib/run-progress";

const THROTTLE_MS = 120;

export async function streamGeminiPreambleToProgress(params: {
  runId: string;
  userText: string;
  model: string;
}) {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) return;

  const gen = new GoogleGenerativeAI(apiKey);
  const m = gen.getGenerativeModel({ model: params.model });
  const prompt = `You are explaining to an engineer what you will do next (max 6 short sentences). User request:\n${params.userText.slice(0, 6000)}`;

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

  try {
    const out = await m.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
    });

    for await (const chunk of out.stream) {
      let t = "";
      try {
        t = chunk.text();
      } catch {
        /* partial chunk */
      }
      if (t) acc += t;
      const now = Date.now();
      if (now - lastFlush >= THROTTLE_MS) {
        lastFlush = now;
        await flush();
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
}
