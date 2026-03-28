import type { Sandbox } from "@e2b/code-interpreter";

const TEST_CMD =
  "bash -lc 'cd /home/user 2>/dev/null || cd /workspace 2>/dev/null || cd . && (npx --yes vitest run --passWithNoTests 2>&1 || npm test -- --passWithNoTests --watch=false 2>&1)'";

export type SandboxTestResult = {
  ok: boolean;
  log: string;
};

export async function sandboxRunTests(sandbox: Sandbox): Promise<SandboxTestResult> {
  try {
    const result = await sandbox.commands.run(TEST_CMD, {
      timeoutMs: 240_000,
    });
    const log = `${result.stdout}\n${result.stderr}`.trim().slice(0, 14_000);
    return { ok: result.exitCode === 0, log };
  } catch (e) {
    const cmd = e as { exitCode?: number; stdout?: string; stderr?: string };
    const log =
      `${typeof cmd.stdout === "string" ? cmd.stdout : ""}\n${typeof cmd.stderr === "string" ? cmd.stderr : ""}`.trim() ||
      (e instanceof Error ? e.message : String(e));
    return {
      ok: cmd.exitCode === 0,
      log: log.slice(0, 14_000),
    };
  }
}
