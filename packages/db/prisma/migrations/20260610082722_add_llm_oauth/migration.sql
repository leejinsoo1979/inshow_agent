-- AlterTable
ALTER TABLE "LlmProviderConfig" ADD COLUMN     "authType" TEXT NOT NULL DEFAULT 'api_key',
ADD COLUMN     "encryptedAccessToken" TEXT,
ADD COLUMN     "encryptedRefreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "encryptedApiKey" DROP NOT NULL;
