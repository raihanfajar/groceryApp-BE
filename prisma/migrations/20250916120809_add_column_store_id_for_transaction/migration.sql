/*
  Warnings:

  - Added the required column `storeId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreshNear"."Transaction" ADD COLUMN     "storeId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "FreshNear"."Transaction" ADD CONSTRAINT "Transaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "FreshNear"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
