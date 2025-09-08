-- CreateEnum
CREATE TYPE "FreshNear"."StockMovement" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'INITIAL');

-- AlterTable
ALTER TABLE "FreshNear"."StoreProduct" ADD COLUMN     "minStock" INTEGER DEFAULT 5;

-- CreateTable
CREATE TABLE "FreshNear"."StockJournal" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "transactionId" TEXT,
    "type" "FreshNear"."StockMovement" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "beforeStock" INTEGER NOT NULL,
    "afterStock" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockJournal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockJournal_storeId_productId_idx" ON "FreshNear"."StockJournal"("storeId", "productId");

-- CreateIndex
CREATE INDEX "StockJournal_adminId_idx" ON "FreshNear"."StockJournal"("adminId");

-- CreateIndex
CREATE INDEX "StockJournal_createdAt_idx" ON "FreshNear"."StockJournal"("createdAt");

-- AddForeignKey
ALTER TABLE "FreshNear"."StockJournal" ADD CONSTRAINT "StockJournal_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "FreshNear"."Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."StockJournal" ADD CONSTRAINT "StockJournal_storeId_productId_fkey" FOREIGN KEY ("storeId", "productId") REFERENCES "FreshNear"."StoreProduct"("storeId", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreshNear"."StockJournal" ADD CONSTRAINT "StockJournal_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FreshNear"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
