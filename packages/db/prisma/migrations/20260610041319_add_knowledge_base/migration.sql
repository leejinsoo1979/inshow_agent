-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('FILE', 'URL', 'OFFICIAL_LAW', 'KCSC', 'MANUFACTURER', 'INTERNAL_MANUAL', 'WEB');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('PENDING_PROCESSING', 'PROCESSING', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('OFFICIAL', 'MANUFACTURER', 'INTERNAL_APPROVED', 'INTERNAL_UNVERIFIED', 'WEB_UNVERIFIED');

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "KnowledgeSourceType" NOT NULL DEFAULT 'FILE',
    "uri" TEXT,
    "fileKey" TEXT,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'PENDING_PROCESSING',
    "trustLevel" "TrustLevel" NOT NULL DEFAULT 'INTERNAL_UNVERIFIED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "page" INTEGER,
    "section" TEXT,
    "tokenCount" INTEGER,
    "embedding" JSONB,
    "metadata" JSONB,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeSource_workspaceId_status_sourceType_idx" ON "KnowledgeSource"("workspaceId", "status", "sourceType");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_sourceId_chunkIndex_idx" ON "KnowledgeChunk"("sourceId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
