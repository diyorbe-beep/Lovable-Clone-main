import { env } from "@/config/env";
import prisma from "@/lib/prisma";
import { log } from "@/lib/logger";

import { assertSafeSchemaName, postgresSchemaForProject } from "./schema";

export async function ensureHostedProjectEnvironment(projectId: string) {
  const postgresSchema = postgresSchemaForProject(projectId);
  assertSafeSchemaName(postgresSchema);

  try {
    await prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS ${postgresSchema}`,
    );
  } catch (e) {
    log({
      level: "error",
      message: "Failed to CREATE SCHEMA for hosted project",
      projectId,
      error: e,
    });
    return prisma.hostedProjectEnvironment.upsert({
      where: { projectId },
      create: {
        projectId,
        postgresSchema,
        status: "error",
        lastError:
          e instanceof Error ? e.message.slice(0, 500) : "schema_create_failed",
        publicSupabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      },
      update: {
        status: "error",
        lastError:
          e instanceof Error ? e.message.slice(0, 500) : "schema_create_failed",
      },
    });
  }

  const row = await prisma.hostedProjectEnvironment.upsert({
    where: { projectId },
    create: {
      projectId,
      postgresSchema,
      status: "active",
      lastProvisionedAt: new Date(),
      publicSupabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    },
    update: {
      status: "active",
      lastError: null,
      lastProvisionedAt: new Date(),
      publicSupabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    },
  });

  return row;
}
