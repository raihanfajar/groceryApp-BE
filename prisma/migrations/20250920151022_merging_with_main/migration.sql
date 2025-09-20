/*
  Warnings:

  - Made the column `province` on table `UserAddress` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `UserAddress` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cityId` on table `UserAddress` required. This step will fail if there are existing NULL values in that column.
  - Made the column `provinceId` on table `UserAddress` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FreshNear"."UserAddress" ALTER COLUMN "province" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "cityId" SET NOT NULL,
ALTER COLUMN "provinceId" SET NOT NULL;
