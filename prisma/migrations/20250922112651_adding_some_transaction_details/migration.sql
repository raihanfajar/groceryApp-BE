/*
  Warnings:

  - Added the required column `finalProductPrice` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalProductPrice` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `discountedShipping` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" ADD COLUMN     "discountedProductPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalProductPrice" INTEGER NOT NULL,
ADD COLUMN     "totalProductPrice" INTEGER NOT NULL,
ALTER COLUMN "discountedShipping" SET NOT NULL;
