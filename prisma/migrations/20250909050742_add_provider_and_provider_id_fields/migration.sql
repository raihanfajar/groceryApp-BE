/*
  Warnings:

  - You are about to drop the column `oauthProvider` on the `Users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,providerId]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Users" DROP COLUMN "oauthProvider",
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Users_provider_providerId_key" ON "FreshNear"."Users"("provider", "providerId");
