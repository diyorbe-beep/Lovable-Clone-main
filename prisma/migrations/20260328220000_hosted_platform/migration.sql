-- AlterTable
ALTER TABLE "Fragment" ADD COLUMN IF NOT EXISTS "persistentPreviewUrl" TEXT;

-- CreateTable
CREATE TABLE "HostedProjectEnvironment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "postgresSchema" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastError" TEXT,
    "publicSupabaseUrl" TEXT,
    "encryptedPublicAnonKey" TEXT,
    "persistentPreviewUrl" TEXT,
    "vercelDeploymentUrl" TEXT,
    "lastProvisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostedProjectEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostedProjectEnvironment_projectId_key" ON "HostedProjectEnvironment"("projectId");

-- CreateIndex
CREATE INDEX "HostedProjectEnvironment_postgresSchema_idx" ON "HostedProjectEnvironment"("postgresSchema");

-- AddForeignKey
ALTER TABLE "HostedProjectEnvironment" ADD CONSTRAINT "HostedProjectEnvironment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
