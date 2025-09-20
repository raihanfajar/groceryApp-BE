/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `ProductCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."ProductCategory" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "FreshNear"."ProductCategory"("slug");
