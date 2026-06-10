-- AlterTable
ALTER TABLE "DocumentBlock" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "DocumentBlock_parentId_idx" ON "DocumentBlock"("parentId");

-- AddForeignKey
ALTER TABLE "DocumentBlock" ADD CONSTRAINT "DocumentBlock_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
