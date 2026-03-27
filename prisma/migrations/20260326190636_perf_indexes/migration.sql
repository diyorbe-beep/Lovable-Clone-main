-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "JobRun_userId_status_createdAt_idx" ON "JobRun"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "JobRun_projectId_createdAt_idx" ON "JobRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "JobRun_projectId_status_createdAt_idx" ON "JobRun"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Membership_userId_role_idx" ON "Membership"("userId", "role");

-- CreateIndex
CREATE INDEX "Message_projectId_createdAt_idx" ON "Message"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_runId_role_idx" ON "Message"("runId", "role");

-- CreateIndex
CREATE INDEX "Message_projectId_updatedAt_idx" ON "Message"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "PromptMetric_runId_createdAt_idx" ON "PromptMetric"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptMetric_status_createdAt_idx" ON "PromptMetric"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PromptMetric_promptVersion_createdAt_idx" ON "PromptMetric"("promptVersion", "createdAt");
