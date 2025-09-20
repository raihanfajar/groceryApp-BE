/*
  Warnings:

  - You are about to drop the column `paymentGatewayId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "FreshNear"."Transaction_paymentGatewayId_key";

-- AlterTable
ALTER TABLE "FreshNear"."Transaction" DROP COLUMN "paymentGatewayId",
ADD COLUMN     "snapRedirectUrl" TEXT,
ADD COLUMN     "snapToken" TEXT,
ADD COLUMN     "snapTokenExpiryAt" TIMESTAMP(3);
