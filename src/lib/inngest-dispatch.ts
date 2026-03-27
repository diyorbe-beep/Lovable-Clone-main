import { inngest } from "@/inngest/client";
import { env } from "@/config/env";

type DispatchPayload = {
  value: string;
  projectId: string;
  runId: string;
  userId: string;
  requestId: string;
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

  await inngest.send({
    name: "code-agent/run",
    data,
  });
}
