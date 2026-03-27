import { env } from "@/config/env";

export function getMaxActiveRunsPerUser() {
  return env.MAX_ACTIVE_RUNS_PER_USER ?? 1;
}
