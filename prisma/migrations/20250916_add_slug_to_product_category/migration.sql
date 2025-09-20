-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Update existing categories with slugs based on their names
UPDATE "ProductCategory" SET "slug" = 
  CASE 
    WHEN "name" = 'Fresh Fruits' THEN 'fresh-fruits'
    WHEN "name" = 'Vegetables' THEN 'vegetables'
    WHEN "name" = 'Dairy & Eggs' THEN 'dairy-eggs'
    WHEN "name" = 'Meat & Seafood' THEN 'meat-seafood'
    WHEN "name" = 'Beverages' THEN 'beverages'
    WHEN "name" = 'Snacks' THEN 'snacks'
    ELSE LOWER(REPLACE(REPLACE(REPLACE("name", ' ', '-'), '&', ''), ' ', ''))
  END
WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");
