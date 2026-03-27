import prisma from "./prisma";
import { log } from "./logger";
import { Prisma } from "@/generated/prisma";

interface AuditInput {
  actorId: string;
  action: string;
  workspaceId?: string | null;
  resourceId?: string | null;
  metadata?: Prisma.JsonObject;
}

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        workspaceId: input.workspaceId ?? undefined,
        resourceId: input.resourceId ?? undefined,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    log({
      level: "warn",
      message: "Failed to write audit log",
      userId: input.actorId,
      error,
      meta: { action: input.action, resourceId: input.resourceId },
    });
  }
}
