/*
  Warnings:

  - Added the required column `district` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `UserAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."UserAddress" ADD COLUMN     "district" INTEGER NOT NULL,
ADD COLUMN     "districtId" INTEGER NOT NULL;
