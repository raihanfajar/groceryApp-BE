/*
  Warnings:

  - Added the required column `addressLabel` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" ADD COLUMN     "addressLabel" TEXT NOT NULL;
