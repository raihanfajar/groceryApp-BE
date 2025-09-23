/*
  Warnings:

  - Made the column `weight` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Product" ALTER COLUMN "weight" SET NOT NULL;
