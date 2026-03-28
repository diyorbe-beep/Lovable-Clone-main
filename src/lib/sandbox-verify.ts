import type { Sandbox } from "@e2b/code-interpreter";

const VERIFY_CMD =
  "bash -lc 'cd /home/user 2>/dev/null || cd /workspace 2>/dev/null || cd . && npx --yes next lint --max-warnings 0'";

function aggregateLog(result: { stdout: string; stderr: string }): string {
  return `${result.stdout}\n${result.stderr}`.trim();
}

/**
 * Best-effort static check inside the sandbox. Non-zero exit → needs fix pass.
 */
export async function sandboxLintVerify(sandbox: Sandbox): Promise<{
  ok: boolean;
  log: string;
}> {
  try {
    const result = await sandbox.commands.run(VERIFY_CMD, {
      timeoutMs: 180_000,
    });
    const log = aggregateLog(result).slice(0, 12_000);
    return {
      ok: result.exitCode === 0,
      log,
    };
  } catch (e) {
    const cmd = e as { exitCode?: number; stdout?: string; stderr?: string };
    const log =
      aggregateLog({
        stdout: typeof cmd.stdout === "string" ? cmd.stdout : "",
        stderr: typeof cmd.stderr === "string" ? cmd.stderr : "",
      }) ||
      (e instanceof Error ? e.message : String(e));
    const ok = cmd.exitCode === 0;
    return {
      ok,
      log: log.slice(0, 12_000),
    };
  }
}
