/*
  Warnings:

  - You are about to drop the column `slug` on the `ProductCategory` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "FreshNear"."ProductCategory_slug_key";

-- AlterTable
ALTER TABLE "FreshNear"."ProductCategory" DROP COLUMN "slug",
ADD COLUMN     "icon" TEXT;
