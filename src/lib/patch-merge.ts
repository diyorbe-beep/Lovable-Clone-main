import type { FileCollection } from "@/types";

/** Shallow merge: later keys win. Used to preserve prior project files + apply patches. */
export function mergeFileCollections(
  base: FileCollection,
  patch: FileCollection,
): FileCollection {
  return { ...base, ...patch };
}
