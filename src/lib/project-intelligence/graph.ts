import type { FileCollection } from "@/types";

export type ProjectGraph = {
  /** normalized path -> files it imports(resolves to project path when possible) */
  adjacency: Map<string, Set<string>>;
  /** path -> imported symbols/paths (raw) */
  imports: Map<string, string[]>;
};

const FROM_RE =
  /(?:import\s+[\w*{}\s,]+\s+from\s+|export\s+[\w*{}\s,]+\s+from\s+)['"]([^'"]+)['"]/g;

function normPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

function resolveAlias(
  spec: string,
  fromFile: string,
  files: FileCollection,
): string | null {
  const s = spec.trim();
  if (s.startsWith("@/")) {
    const tail = s.slice(2);
    const candidates = [
      tail,
      `${tail}.ts`,
      `${tail}.tsx`,
      `components/${tail}`,
      `lib/${tail}`,
      `app/${tail}`,
      `src/${tail}`,
    ];
    for (const c of candidates) {
      const k = normPath(c);
      if (k in files) return k;
      if (`${k}.tsx` in files) return `${k}.tsx`;
      if (`${k}.ts` in files) return `${k}.ts`;
    }
    return null;
  }
  if (s.startsWith(".") && fromFile.includes("/")) {
    const baseDir = fromFile.replace(/\/[^/]+$/, "");
    const parts = s.split("/");
    const stack = baseDir.split("/").filter(Boolean);
    for (const part of parts) {
      if (part === "..") stack.pop();
      else if (part === ".") continue;
      else stack.push(part);
    }
    let rel = stack.join("/");
    rel = normPath(rel);
    if (rel in files) return rel;
    if (`${rel}.tsx` in files) return `${rel}.tsx`;
    if (`${rel}.ts` in files) return `${rel}.ts`;
    return null;
  }
  return null;
}

/** Build import adjacency from TS/TSX project files. */
export function buildProjectGraph(files: FileCollection): ProjectGraph {
  const adjacency = new Map<string, Set<string>>();
  const imports = new Map<string, string[]>();

  const paths = Object.keys(files).filter((p) =>
    /\.(tsx?|jsx?)$/.test(p.replace(/\\/g, "/")),
  );

  for (const path of paths) {
    const content = files[path];
    if (typeof content !== "string") continue;
    const np = normPath(path);
    if (!adjacency.has(np)) adjacency.set(np, new Set());

    const found: string[] = [];
    for (const re of [FROM_RE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const spec = m[1];
        if (!spec || spec.startsWith("http")) continue;
        found.push(spec);
        const resolved =
          resolveAlias(spec, np, files) ||
          (/^\.\.?[/]/.test(spec) ? resolveAlias(spec, np, files) : null);
        if (resolved && paths.some((x) => normPath(x) === resolved)) {
          adjacency.get(np)!.add(resolved);
        }
      }
    }
    imports.set(np, found);
  }

  return { adjacency, imports };
}

/** Reverse edges: who imports `path`. */
export function reverseAdjacency(graph: ProjectGraph): Map<string, Set<string>> {
  const rev = new Map<string, Set<string>>();
  for (const [from, tos] of graph.adjacency) {
    for (const to of tos) {
      if (!rev.has(to)) rev.set(to, new Set());
      rev.get(to)!.add(from);
    }
  }
  return rev;
}

/** Short human summary for prompts (cap size). */
export function formatGraphSummary(
  graph: ProjectGraph,
  maxEdges = 48,
): string {
  const lines: string[] = [];
  let count = 0;
  for (const [from, tos] of graph.adjacency) {
    for (const to of tos) {
      if (count >= maxEdges) break;
      lines.push(`${from} → ${to}`);
      count += 1;
    }
    if (count >= maxEdges) break;
  }
  if (lines.length === 0) return "(no local import graph yet)";
  return lines.join("\n");
}

export function collectDependents(
  graph: ProjectGraph,
  changed: string[],
  maxTotal = 64,
): string[] {
  const rev = reverseAdjacency(graph);
  const out = new Set<string>();
  const q = changed.map(normPath).filter(Boolean);
  while (q.length && out.size < maxTotal) {
    const p = q.shift()!;
    if (!out.has(p)) {
      out.add(p);
      const parents = rev.get(p);
      if (parents) {
        for (const par of parents) {
          if (!out.has(par)) q.push(par);
        }
      }
    }
  }
  return [...out];
}
