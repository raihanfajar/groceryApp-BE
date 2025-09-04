/*
  Warnings:

  - You are about to drop the column `profilePicture` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `refferalCode` on the `Users` table. All the data in the column will be lost.
  - Added the required column `cityId` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceId` to the `Store` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cityId` to the `UserAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceId` to the `UserAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Store" ADD COLUMN     "cityId" INTEGER NOT NULL,
ADD COLUMN     "provinceId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FreshNear"."UserAddress" ADD COLUMN     "cityId" INTEGER NOT NULL,
ADD COLUMN     "provinceId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FreshNear"."Users" DROP COLUMN "profilePicture",
DROP COLUMN "refferalCode";
