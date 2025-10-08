-- AlterTable
ALTER TABLE "FreshNear"."Discount" ADD COLUMN     "bannerImageUrl" TEXT,
ADD COLUMN     "displayOrder" INTEGER,
ADD COLUMN     "isMarketingPromo" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Discount_isMarketingPromo_idx" ON "FreshNear"."Discount"("isMarketingPromo");
