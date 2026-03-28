import prisma from "./prisma";

/** @param userId internal `User.id` (UUID), not the Clerk subject */
export async function ensureDefaultWorkspace(userId: string) {
  const existing = await prisma.membership.findFirst({
    where: { userId },
    include: { workspace: true },
  });

  if (existing?.workspace) {
    return existing.workspace;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "My Workspace",
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  return workspace;
}
