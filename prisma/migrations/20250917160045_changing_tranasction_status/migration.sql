/*
  Warnings:

  - The values [confirmed] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FreshNear"."OrderStatus_new" AS ENUM ('waiting_payment', 'waiting_confirmation', 'on_process', 'shipped', 'completed', 'cancelled');
ALTER TABLE "FreshNear"."Transaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FreshNear"."Transaction" ALTER COLUMN "status" TYPE "FreshNear"."OrderStatus_new" USING ("status"::text::"FreshNear"."OrderStatus_new");
ALTER TYPE "FreshNear"."OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "FreshNear"."OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "FreshNear"."OrderStatus_old";
ALTER TABLE "FreshNear"."Transaction" ALTER COLUMN "status" SET DEFAULT 'waiting_payment';
COMMIT;
