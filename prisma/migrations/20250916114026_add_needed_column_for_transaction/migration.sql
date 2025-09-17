/*
  Warnings:

  - You are about to drop the column `userAddress` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `address` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cityId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalShippingPrice` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" DROP COLUMN "userAddress",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "cityId" INTEGER NOT NULL,
ADD COLUMN     "discountedShipping" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalShippingPrice" INTEGER NOT NULL,
ADD COLUMN     "province" TEXT NOT NULL,
ADD COLUMN     "provinceId" INTEGER NOT NULL;
