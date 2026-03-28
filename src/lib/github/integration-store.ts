import prisma from "@/lib/prisma";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "@/lib/crypto/integration-token";

export async function getGitHubTokenForClerkUser(
  clerkUserId: string,
  encryptionKey: string,
): Promise<string | null> {
  const row = await prisma.gitHubIntegration.findUnique({
    where: { clerkUserId },
  });
  if (!row) return null;
  try {
    return decryptIntegrationSecret(row.accessTokenEnc, encryptionKey);
  } catch {
    return null;
  }
}

export async function upsertGitHubIntegration(
  clerkUserId: string,
  githubLogin: string,
  accessToken: string,
  scope: string | null,
  encryptionKey: string,
): Promise<void> {
  const accessTokenEnc = encryptIntegrationSecret(accessToken, encryptionKey);
  await prisma.gitHubIntegration.upsert({
    where: { clerkUserId },
    create: {
      clerkUserId,
      githubLogin,
      accessTokenEnc,
      scope: scope ?? undefined,
    },
    update: {
      githubLogin,
      accessTokenEnc,
      scope: scope ?? undefined,
    },
  });
}

export async function deleteGitHubIntegration(
  clerkUserId: string,
): Promise<void> {
  await prisma.gitHubIntegration.deleteMany({
    where: { clerkUserId },
  });
}
