-- GitHub OAuth token storage (encrypted at rest in app layer)
CREATE TABLE "GitHubIntegration" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GitHubIntegration_clerkUserId_key" ON "GitHubIntegration"("clerkUserId");
