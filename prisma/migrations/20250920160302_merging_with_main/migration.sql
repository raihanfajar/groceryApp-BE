/*
  Warnings:

  - Added the required column `district` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" ADD COLUMN     "district" INTEGER NOT NULL,
ADD COLUMN     "districtId" INTEGER NOT NULL;
