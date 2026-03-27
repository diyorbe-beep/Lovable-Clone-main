-- CreateTable
CREATE TABLE "PromptMetric" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptMetric_pkey" PRIMARY KEY ("id")
);
