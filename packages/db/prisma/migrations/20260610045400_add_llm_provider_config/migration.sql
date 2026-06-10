-- CreateTable
CREATE TABLE "LlmProviderConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "baseUrl" TEXT,
    "encryptedApiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmProviderConfig_workspaceId_isActive_idx" ON "LlmProviderConfig"("workspaceId", "isActive");
