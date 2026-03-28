import type { Sandbox } from "@e2b/code-interpreter";

/**
 * Merge key=value lines into the sandbox Next.js `.env.local` so `process.env` works in Route Handlers.
 * Strips prior lines with the same keys to avoid duplicates across runs.
 */
function dotenvEscapeDoubleQuoted(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}

export async function mergeSandboxEnvLocal(
  sandbox: Sandbox,
  entries: Record<string, string>,
): Promise<void> {
  const keys = new Set(Object.keys(entries));
  let base = "";
  try {
    base = await sandbox.files.read(".env.local");
  } catch {
    /* template may omit .env.local */
  }

  const filtered = base
    .split(/\r?\n/)
    .filter((ln) => {
      const trimmed = ln.trim();
      if (!trimmed || trimmed.startsWith("#")) return true;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return true;
      const key = trimmed.slice(0, eq).trim();
      return !keys.has(key);
    })
    .join("\n");

  const appended = Object.entries(entries)
    .map(([k, v]) => `${k}="${dotenvEscapeDoubleQuoted(v)}"`)
    .join("\n");

  const next = `${filtered.replace(/\s+$/, "")}\n${appended}\n`.replace(
    /^\n+/,
    "",
  );
  await sandbox.files.write(".env.local", next);
}
