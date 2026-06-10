-- CreateEnum
CREATE TYPE "OntologyStatus" AS ENUM ('CANDIDATE', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "OntologyNode" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" "OntologyStatus" NOT NULL DEFAULT 'CANDIDATE',
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OntologyNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OntologyEdge" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "status" "OntologyStatus" NOT NULL DEFAULT 'CANDIDATE',
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OntologyEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OntologyNode_workspaceId_type_status_idx" ON "OntologyNode"("workspaceId", "type", "status");

-- CreateIndex
CREATE INDEX "OntologyEdge_workspaceId_sourceNodeId_targetNodeId_relation_idx" ON "OntologyEdge"("workspaceId", "sourceNodeId", "targetNodeId", "relationType");

-- AddForeignKey
ALTER TABLE "OntologyEdge" ADD CONSTRAINT "OntologyEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "OntologyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OntologyEdge" ADD CONSTRAINT "OntologyEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "OntologyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
