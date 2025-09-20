/*
  Warnings:

  - You are about to drop the column `snapTokenExpiryAt` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" DROP COLUMN "snapTokenExpiryAt";
