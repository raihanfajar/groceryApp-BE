/*
  Warnings:

  - A unique constraint covering the columns `[cartId,productId,storeId]` on the table `CartProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CartProduct_cartId_productId_storeId_key" ON "FreshNear"."CartProduct"("cartId", "productId", "storeId");
