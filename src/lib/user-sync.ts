import prisma from "./prisma";

export type ClerkWebhookUser = {
  id: string;
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

function primaryEmailFromClerkUser(data: ClerkWebhookUser): string | undefined {
  const list = data.email_addresses;
  if (!list?.length) return undefined;
  const pid = data.primary_email_address_id;
  if (pid) {
    const hit = list.find((e) => e.id === pid);
    if (hit?.email_address) return hit.email_address;
  }
  return list[0]?.email_address;
}

/**
 * Upserts `User` from Clerk webhook payload (richer than first API hit).
 */
export async function syncClerkUserFromWebhook(data: ClerkWebhookUser) {
  const email = primaryEmailFromClerkUser(data);
  const name =
    [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;

  await prisma.user.upsert({
    where: { clerkId: data.id },
    create: {
      clerkId: data.id,
      email: email ?? null,
      name,
      image: data.image_url ?? null,
    },
    update: {
      email: email ?? null,
      name,
      image: data.image_url ?? null,
    },
  });
}

/**
 * Ensures a Prisma `User` row exists for the signed-in Clerk account.
 * All FKs (`Project.userId`, `JobRun.userId`, `Workspace.ownerId`, …) must use the returned `id` (internal UUID), not the Clerk subject string.
 */
export async function ensureAppUser(clerkUserId: string) {
  return prisma.user.upsert({
    where: { clerkId: clerkUserId },
    create: { clerkId: clerkUserId },
    update: {},
    select: { id: true, clerkId: true },
  });
}
