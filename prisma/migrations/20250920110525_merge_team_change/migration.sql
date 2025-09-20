/*
  Warnings:

  - You are about to drop the column `address` on the `UserAddress` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `UserAddress` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `UserAddress` table. All the data in the column will be lost.
  - Added the required column `addressDetails` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressDisplayName` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressLabel` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lon` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverName` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverPhoneNumber` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Made the column `lat` on table `UserAddress` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FreshNear"."UserAddress" DROP COLUMN "address",
DROP COLUMN "lng",
DROP COLUMN "phoneNumber",
ADD COLUMN     "addressDetails" TEXT NOT NULL,
ADD COLUMN     "addressDisplayName" TEXT NOT NULL,
ADD COLUMN     "addressLabel" TEXT NOT NULL,
ADD COLUMN     "lon" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "receiverName" TEXT NOT NULL,
ADD COLUMN     "receiverPhoneNumber" TEXT NOT NULL,
ALTER COLUMN "province" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "lat" SET NOT NULL,
ALTER COLUMN "cityId" DROP NOT NULL,
ALTER COLUMN "provinceId" DROP NOT NULL;
