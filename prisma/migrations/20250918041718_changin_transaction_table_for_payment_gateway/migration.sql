/*
  Warnings:

  - A unique constraint covering the columns `[paymentGatewayId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentGatewayId" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ALTER COLUMN "expiryAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paymentGatewayId_key" ON "FreshNear"."Transaction"("paymentGatewayId");
