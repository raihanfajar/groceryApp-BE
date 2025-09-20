/*
  Warnings:

  - The primary key for the `UserAddress` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "FreshNear"."UserAddress" DROP CONSTRAINT "UserAddress_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "UserAddress_id_seq";
