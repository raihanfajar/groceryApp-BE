-- CreateEnum
CREATE TYPE "FreshNear"."DiscountType" AS ENUM ('MANUAL', 'MINIMUM_PURCHASE', 'BOGO', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "FreshNear"."DiscountValueType" AS ENUM ('PERCENTAGE', 'NOMINAL');

-- CreateTable
CREATE TABLE "FreshNear"."Discount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FreshNear"."DiscountType" NOT NULL,
    "valueType" "FreshNear"."DiscountValueType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxDiscountAmount" INTEGER,
    "minTransactionValue" INTEGER,
    "maxUsagePerCustomer" INTEGER,
    "totalUsageLimit" INTEGER,
    "currentUsageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "adminId" TEXT NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreshNear"."DiscountProduct" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreshNear"."BogoDiscount" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "buyQuantity" INTEGER NOT NULL,
    "getQuantity" INTEGER NOT NULL,
    "applyToSameProduct" BOOLEAN NOT NULL DEFAULT true,
    "maxBogoSets" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BogoDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreshNear"."DiscountUsageHistory" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "transactionId" TEXT,
    "userId" TEXT,
    "adminId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discountValue" INTEGER NOT NULL,
    "orderTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountUsageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discount_storeId_idx" ON "FreshNear"."Discount"("storeId");

-- CreateIndex
CREATE INDEX "Discount_isActive_idx" ON "FreshNear"."Discount"("isActive");

-- CreateIndex
CREATE INDEX "Discount_startDate_endDate_idx" ON "FreshNear"."Discount"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountProduct_discountId_productId_key" ON "FreshNear"."DiscountProduct"("discountId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "BogoDiscount_discountId_key" ON "FreshNear"."BogoDiscount"("discountId");

-- CreateIndex
CREATE INDEX "DiscountUsageHistory_discountId_idx" ON "FreshNear"."DiscountUsageHistory"("discountId");

-- CreateIndex
CREATE INDEX "DiscountUsageHistory_transactionId_idx" ON "FreshNear"."DiscountUsageHistory"("transactionId");

-- CreateIndex
CREATE INDEX "DiscountUsageHistory_userId_idx" ON "FreshNear"."DiscountUsageHistory"("userId");

-- CreateIndex
CREATE INDEX "DiscountUsageHistory_usedAt_idx" ON "FreshNear"."DiscountUsageHistory"("usedAt");

-- AddForeignKey
ALTER TABLE "FreshNear"."Discount" ADD CONSTRAINT "Discount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "FreshNear"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."Discount" ADD CONSTRAINT "Discount_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "FreshNear"."Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."DiscountProduct" ADD CONSTRAINT "DiscountProduct_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "FreshNear"."Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."DiscountProduct" ADD CONSTRAINT "DiscountProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FreshNear"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."BogoDiscount" ADD CONSTRAINT "BogoDiscount_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "FreshNear"."Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."DiscountUsageHistory" ADD CONSTRAINT "DiscountUsageHistory_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "FreshNear"."Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."DiscountUsageHistory" ADD CONSTRAINT "DiscountUsageHistory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FreshNear"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."DiscountUsageHistory" ADD CONSTRAINT "DiscountUsageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "FreshNear"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."DiscountUsageHistory" ADD CONSTRAINT "DiscountUsageHistory_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "FreshNear"."Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
