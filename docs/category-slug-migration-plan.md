# Category Slug Migration Plan

## Current Status

- ✅ Dynamic slug generation working
- ✅ Frontend integration complete
- ✅ API endpoints working with slugs
- ❌ Database slug column not yet added (due to intermittent connectivity)

## Migration Strategy

### Step 1: Add Slug Column to Schema

When database connectivity is stable, update `prisma/schema.prisma`:

```prisma
model ProductCategory {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique  // Add this line
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  products    Product[]
}
```

### Step 2: Create Migration

Run: `npx prisma migrate dev --name add_slug_to_product_category`

### Step 3: Populate Existing Data

Run: `npm run migrate:slugs` (script already created)

### Step 4: Update CategoryService

The service is already prepared to work with database slugs. No changes needed.

### Step 5: Update Seed Script

The seed script is already updated to include slug generation.

## Benefits of Database Slug Column

1. **Performance**: Direct database queries instead of filtering all categories
2. **Consistency**: Slugs stored permanently, no dynamic generation overhead
3. **Flexibility**: Can customize slugs independently of names if needed
4. **SEO**: Slugs won't change if category names are updated
5. **Indexing**: Database-level unique constraint and indexing on slug field

## Fallback Strategy

The current implementation will continue to work with dynamic slug generation until the database migration is applied. This provides:

- Zero downtime migration
- Backward compatibility
- Same API behavior
- Same frontend functionality

## Testing After Migration

1. Verify categories API returns slugs from database
2. Test category by slug endpoint
3. Test product filtering by category slug
4. Verify frontend category navigation
5. Test admin category CRUD operations

## Files Ready for Migration

- ✅ `scripts/migrate-category-slugs.ts` - Populates existing categories with slugs
- ✅ `prisma/schema.prisma` - Schema ready to be updated
- ✅ Updated CategoryService (currently using dynamic, ready for database slugs)
- ✅ Updated seed script (ready to create categories with slugs)
- ✅ Frontend already supports slug-based navigation

## Current Working Features

All slug-based functionality is working with dynamic generation:

- Category listing with slugs
- Category filtering by slug
- Product filtering by category slug
- Frontend navigation using slugs
- SEO-friendly URLs
