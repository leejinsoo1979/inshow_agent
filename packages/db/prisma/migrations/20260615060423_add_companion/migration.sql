-- CreateTable
CREATE TABLE "CompanionDevice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT,
    "pairCode" TEXT,
    "pairExpires" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanionDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanionJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "deviceId" TEXT,
    "documentId" TEXT,
    "tool" TEXT NOT NULL DEFAULT 'codex',
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanionDevice_workspaceId_idx" ON "CompanionDevice"("workspaceId");

-- CreateIndex
CREATE INDEX "CompanionDevice_pairCode_idx" ON "CompanionDevice"("pairCode");

-- CreateIndex
CREATE INDEX "CompanionDevice_tokenHash_idx" ON "CompanionDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "CompanionJob_workspaceId_status_idx" ON "CompanionJob"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "CompanionJob" ADD CONSTRAINT "CompanionJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "CompanionDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
