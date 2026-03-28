import { createHash } from "node:crypto";

/** Alphanumeric-safe Postgres schema per project (shared cluster). */
export function postgresSchemaForProject(projectId: string): string {
  const h = createHash("sha256")
    .update(`lc_hosted:${projectId}`)
    .digest("hex")
    .slice(0, 26);
  return `genp_${h}`;
}

export function assertSafeSchemaName(name: string): void {
  if (!/^genp_[a-f0-9]{26}$/.test(name)) {
    throw new Error("Invalid hosted schema name");
  }
}
