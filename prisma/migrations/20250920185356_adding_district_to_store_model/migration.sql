/*
  Warnings:

  - Added the required column `district` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Store" ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "districtId" INTEGER NOT NULL;
