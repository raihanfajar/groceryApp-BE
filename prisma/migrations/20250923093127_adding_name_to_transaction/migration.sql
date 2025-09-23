/*
  Warnings:

  - Added the required column `receiverName` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" ADD COLUMN     "receiverName" TEXT NOT NULL;
