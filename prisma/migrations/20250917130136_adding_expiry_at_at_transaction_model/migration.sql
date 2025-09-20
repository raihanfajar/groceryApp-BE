/*
  Warnings:

  - Added the required column `expiryAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" ADD COLUMN     "expiryAt" TIMESTAMP(3) NOT NULL;
