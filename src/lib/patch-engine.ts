import { expandRelatedPaths } from "@/lib/file-deps";
import {
  buildProjectGraph,
  collectDependents,
  type ProjectGraph,
} from "@/lib/project-intelligence";
import type { FileCollection } from "@/types";

/** Expand patch targets using heuristics + dependency graph (dependents). */
export function expandPatchTargets(
  changedPaths: string[],
  baselineFiles: FileCollection,
  graph?: ProjectGraph,
): string[] {
  const heuristic = expandRelatedPaths(changedPaths);
  const s = new Set(heuristic);
  if (graph) {
    const deps = collectDependents(graph, changedPaths, 48);
    for (const p of deps) s.add(p);
  }
  for (const p of changedPaths) s.add(p.replace(/\\/g, "/"));
  return [...s].slice(0, 64);
}

export function ensureGraph(files: FileCollection): ProjectGraph {
  return buildProjectGraph(files);
}

/**
 * Strip agent-written paths from merged state — partial rebuild seeds missing keys from baseline.
 */
export function partialRebuildMerge(
  baseline: FileCollection,
  agentPatch: FileCollection,
  affectedPaths: string[],
): FileCollection {
  const next: FileCollection = { ...baseline, ...agentPatch };
  const set = new Set(affectedPaths.map((p) => p.replace(/\\/g, "/")));
  for (const k of Object.keys(next)) {
    const nk = k.replace(/\\/g, "/");
    if (set.has(nk) && !(k in agentPatch)) {
      if (k in baseline) next[k] = baseline[k];
    }
  }
  return next;
}
