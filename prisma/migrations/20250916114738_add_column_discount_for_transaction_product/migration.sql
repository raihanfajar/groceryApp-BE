/*
  Warnings:

  - Added the required column `finalPrice` to the `TransactionProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."TransactionProduct" ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalPrice" INTEGER NOT NULL;
