/** Heuristic “related paths” for patch context (kept small for UI + prompts). */
export function expandRelatedPaths(paths: string[]): string[] {
  const out = new Set(paths.map((p) => p.replace(/\\/g, "/").replace(/^\/+/, "")));

  for (const p of [...out]) {
    if (/\/(page|layout)\.(tsx|jsx|ts|js)$/.test(p)) {
      const dir = p.replace(/\/[^/]+$/, "");
      out.add(`${dir}/layout.tsx`);
      out.add(`${dir}/layout.jsx`);
      out.add(`${dir}/page.tsx`);
    }
    if (p.startsWith("src/") || p.startsWith("app/")) {
      out.add("src/app/globals.css");
      out.add("app/globals.css");
    }
  }

  return [...out].filter(Boolean).slice(0, 64);
}
