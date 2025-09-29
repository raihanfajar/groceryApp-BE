/*
  Warnings:

  - The values [AUTOMATIC] on the enum `DiscountType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FreshNear"."DiscountType_new" AS ENUM ('MANUAL', 'MINIMUM_PURCHASE', 'BOGO', 'REGULAR');
ALTER TABLE "FreshNear"."Discount" ALTER COLUMN "type" TYPE "FreshNear"."DiscountType_new" USING ("type"::text::"FreshNear"."DiscountType_new");
ALTER TYPE "FreshNear"."DiscountType" RENAME TO "DiscountType_old";
ALTER TYPE "FreshNear"."DiscountType_new" RENAME TO "DiscountType";
DROP TYPE "FreshNear"."DiscountType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FreshNear"."Discount" DROP CONSTRAINT "Discount_storeId_fkey";

-- AlterTable
ALTER TABLE "FreshNear"."Discount" ALTER COLUMN "storeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FreshNear"."Discount" ADD CONSTRAINT "Discount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "FreshNear"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
