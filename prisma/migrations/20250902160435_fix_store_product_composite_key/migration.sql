/*
  Warnings:

  - The primary key for the `StoreProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "FreshNear"."StoreProduct" DROP CONSTRAINT "StoreProduct_pkey",
ADD CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("storeId", "productId");
