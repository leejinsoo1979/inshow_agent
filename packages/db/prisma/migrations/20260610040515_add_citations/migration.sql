-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "blockId" TEXT,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "quote" TEXT,
    "sourceType" TEXT,
    "retrievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Citation_blockId_idx" ON "Citation"("blockId");

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "DocumentBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
