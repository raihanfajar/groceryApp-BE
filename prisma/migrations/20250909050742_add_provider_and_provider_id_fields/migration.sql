-- AlterTable
ALTER TABLE "FreshNear"."Users" DROP COLUMN "oauthProvider",
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Users_provider_providerId_key" ON "FreshNear"."Users"("provider", "providerId");
