# Marketing Promo Feature Documentation

## Overview
Simple marketing feature for Super Admin to create promotional banners without creating a new database table. Leverages the existing `Discount` model with additional fields to support marketing/jumbotron promotions.

## Database Changes

### Schema Updates
Added to the existing `Discount` model in `prisma/schema.prisma`:

```prisma
model Discount {
  // ... existing fields ...
  
  // Marketing/Jumbotron fields
  isMarketingPromo    Boolean   @default(false)
  bannerImageUrl      String?
  displayOrder        Int?
  
  // ... existing relations ...
  
  @@index([isMarketingPromo])
}
```

### Migration
- **Migration Name**: `20251008105420_add_marketing_promo_fields_to_discount`
- **Fields Added**:
  - `isMarketingPromo` (Boolean, default: false) - Flag to identify marketing promos
  - `bannerImageUrl` (String, nullable) - Cloudinary URL for jumbotron banner
  - `displayOrder` (Int, nullable) - Control order of promos in jumbotron
- **Index Added**: On `isMarketingPromo` for efficient querying

## Backend Implementation

### API Endpoints

#### Public Endpoints
**GET `/api/discounts/marketing-promos`**
- Get all marketing promos (or active only)
- Query params: `activeOnly=true` (optional)
- **Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Summer Sale 2025",
      "description": "Big discounts on all products",
      "bannerImageUrl": "https://cloudinary.com/...",
      "displayOrder": 1,
      "isActive": true,
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-10-31T23:59:59Z",
      "createdAt": "2025-10-08T10:00:00Z",
      "updatedAt": "2025-10-08T10:00:00Z",
      "admin": {
        "id": "uuid",
        "name": "Super Admin"
      }
    }
  ]
}
```

#### Admin Endpoints (Super Admin Only)

**POST `/api/discounts/marketing-promos`**
- Create a new marketing promo
- **Headers**: `Authorization: Bearer <super_admin_token>`
- **Body** (multipart/form-data):
  - `name` (string, required) - Promo name
  - `description` (string, optional) - Promo description
  - `displayOrder` (number, optional) - Display order
  - `startDate` (datetime, required) - Start date
  - `endDate` (datetime, required) - End date
  - `bannerImage` (file, optional) - Banner image upload
- **Response**:
```json
{
  "status": "success",
  "message": "Marketing promo created successfully",
  "data": { /* promo object */ }
}
```

**PUT `/api/discounts/marketing-promos/:id`**
- Update an existing marketing promo
- **Headers**: `Authorization: Bearer <super_admin_token>`
- **Body** (multipart/form-data): Same as POST (all optional)
- **Response**: Updated promo object

**DELETE `/api/discounts/marketing-promos/:id`**
- Delete (soft delete) a marketing promo
- **Headers**: `Authorization: Bearer <super_admin_token>`
- **Response**:
```json
{
  "status": "success",
  "message": "Marketing promo deleted successfully"
}
```

### Files Created/Modified

#### New Files
1. **`src/middlewares/banner.upload.ts`** (24 lines)
   - Multer middleware for banner image uploads
   - Memory storage
   - Image file validation
   - 5MB file size limit

#### Modified Files
1. **`prisma/schema.prisma`**
   - Added marketing promo fields to Discount model

2. **`src/controllers/discount.controller.ts`** (+107 lines)
   - `createMarketingPromo()` - Create promo with image upload
   - `getMarketingPromos()` - Get all promos (public endpoint)
   - `updateMarketingPromo()` - Update promo with optional new image
   - `deleteMarketingPromo()` - Soft delete promo

3. **`src/services/discount.service.ts`** (+173 lines)
   - `createMarketingPromo()` - Business logic for creating promos
   - `getMarketingPromos()` - Query promos with filtering
   - `updateMarketingPromo()` - Update logic with image handling
   - `deleteMarketingPromo()` - Soft delete logic

4. **`src/routers/discount.route.ts`** (+21 lines)
   - Added public route for getting marketing promos
   - Added Super Admin routes for CRUD operations
   - Integrated banner upload middleware

## Frontend Integration Guide

### 1. Create Admin Page Component
**Location**: `src/app/(admin)/admin/marketing-promos/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

export default function MarketingPromosPage() {
  const { admin } = useAdminAuthStore();
  const queryClient = useQueryClient();
  
  // Fetch promos
  const { data: promos, isLoading } = useQuery({
    queryKey: ["marketing-promos"],
    queryFn: async () => {
      const response = await axiosInstance.get("/discounts/marketing-promos", {
        headers: { Authorization: `Bearer ${admin?.accessToken}` }
      });
      return response.data.data;
    }
  });

  // Create promo mutation
  const createPromo = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axiosInstance.post(
        "/discounts/marketing-promos",
        formData,
        {
          headers: {
            Authorization: `Bearer ${admin?.accessToken}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-promos"] });
    }
  });

  // Form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPromo.mutate(formData);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Marketing Promotions</h1>
      
      {/* Create Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded">
        <h2 className="text-xl mb-4">Create New Promo</h2>
        
        <input
          type="text"
          name="name"
          placeholder="Promo Name"
          required
          className="border p-2 mb-2 w-full"
        />
        
        <textarea
          name="description"
          placeholder="Description"
          className="border p-2 mb-2 w-full"
        />
        
        <input
          type="number"
          name="displayOrder"
          placeholder="Display Order"
          className="border p-2 mb-2 w-full"
        />
        
        <input
          type="datetime-local"
          name="startDate"
          required
          className="border p-2 mb-2 w-full"
        />
        
        <input
          type="datetime-local"
          name="endDate"
          required
          className="border p-2 mb-2 w-full"
        />
        
        <input
          type="file"
          name="bannerImage"
          accept="image/*"
          className="border p-2 mb-2 w-full"
        />
        
        <button
          type="submit"
          disabled={createPromo.isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {createPromo.isPending ? "Creating..." : "Create Promo"}
        </button>
      </form>

      {/* Promos List */}
      <div className="grid gap-4">
        {promos?.map((promo: any) => (
          <div key={promo.id} className="border p-4 rounded">
            <h3 className="font-bold">{promo.name}</h3>
            <p>{promo.description}</p>
            {promo.bannerImageUrl && (
              <img
                src={promo.bannerImageUrl}
                alt={promo.name}
                className="w-full h-32 object-cover mt-2"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Add to Admin Sidebar
**Location**: `src/components/admin/AdminLayout.tsx`

Add menu item:
```tsx
{
  label: "Marketing Promos",
  href: "/admin/marketing-promos",
  icon: <MdCampaign />,
  superAdminOnly: true
}
```

### 3. Update Homepage to Display Promos
**Location**: `src/components/homePage/promoCarousel/PromoCarousel.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";

export default function PromoCarousel() {
  const { data: promos } = useQuery({
    queryKey: ["marketing-promos", "active"],
    queryFn: async () => {
      const response = await axiosInstance.get(
        "/discounts/marketing-promos?activeOnly=true"
      );
      return response.data.data;
    }
  });

  return (
    <div className="carousel">
      {promos?.map((promo: any) => (
        <div key={promo.id} className="carousel-item">
          <img
            src={promo.bannerImageUrl || "/default-banner.jpg"}
            alt={promo.name}
            className="w-full h-64 object-cover"
          />
          <div className="caption">
            <h2>{promo.name}</h2>
            <p>{promo.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## How It Works

### Marketing Promos vs Regular Discounts

| Feature | Marketing Promo | Regular Discount |
|---------|----------------|------------------|
| `isMarketingPromo` | `true` | `false` |
| `type` | Always `MANUAL` | `MANUAL`, `AUTOMATIC`, `BOGO` |
| `value` | 0 (display only) | Actual discount value |
| `storeId` | Always `null` (global) | Can be store-specific |
| `bannerImageUrl` | Required | Not used |
| `displayOrder` | Used for sorting | Not used |
| Visible on homepage | Yes | No |

### Image Upload Flow
1. Super Admin uploads banner image (max 5MB)
2. Multer stores in memory as buffer
3. Buffer uploaded to Cloudinary
4. Cloudinary URL saved in `bannerImageUrl` field
5. Frontend displays image from Cloudinary URL

### Display Logic
- Frontend queries `/api/discounts/marketing-promos?activeOnly=true`
- Returns only promos where:
  - `isMarketingPromo = true`
  - `isActive = true`
  - `startDate <= now`
  - `endDate >= now`
  - `deletedAt IS NULL`
- Sorted by `displayOrder ASC`, then `createdAt DESC`

## Benefits of This Approach

✅ **No New Table**: Reuses existing Discount infrastructure
✅ **Simple Implementation**: Minimal code changes
✅ **Flexible**: Can have discount OR just display-only promos
✅ **Existing Features**: Inherits date range, active/inactive, soft delete
✅ **Easy Queries**: Single table join, efficient indexing
✅ **Future-Proof**: Can link promos to actual discounts later

## Testing Checklist

### Backend
- [ ] Create marketing promo without image
- [ ] Create marketing promo with image upload
- [ ] Update promo with new image
- [ ] Update promo without changing image
- [ ] Get all marketing promos
- [ ] Get only active marketing promos
- [ ] Delete marketing promo (soft delete)
- [ ] Verify only Super Admin can create/update/delete
- [ ] Verify public endpoint works without auth

### Frontend
- [ ] Super Admin sees Marketing Promos menu item
- [ ] Store Admin doesn't see Marketing Promos menu
- [ ] Create form submits successfully
- [ ] Image preview works
- [ ] Promos list displays correctly
- [ ] Homepage jumbotron shows active promos
- [ ] Promos sorted by displayOrder
- [ ] Inactive/expired promos don't show on homepage

## API Examples

### Create Promo with Image
```bash
curl -X POST http://localhost:8000/api/discounts/marketing-promos \
  -H "Authorization: Bearer <super_admin_token>" \
  -F "name=Summer Sale 2025" \
  -F "description=Big discounts on all products" \
  -F "displayOrder=1" \
  -F "startDate=2025-10-01T00:00:00Z" \
  -F "endDate=2025-10-31T23:59:59Z" \
  -F "bannerImage=@/path/to/banner.jpg"
```

### Get Active Promos (Public)
```bash
curl http://localhost:8000/api/discounts/marketing-promos?activeOnly=true
```

### Update Promo
```bash
curl -X PUT http://localhost:8000/api/discounts/marketing-promos/<promo_id> \
  -H "Authorization: Bearer <super_admin_token>" \
  -F "name=Updated Summer Sale" \
  -F "bannerImage=@/path/to/new-banner.jpg"
```

### Delete Promo
```bash
curl -X DELETE http://localhost:8000/api/discounts/marketing-promos/<promo_id> \
  -H "Authorization: Bearer <super_admin_token>"
```

## Database Query Examples

### Get All Marketing Promos
```sql
SELECT * FROM "FreshNear"."Discount"
WHERE "isMarketingPromo" = true
AND "deletedAt" IS NULL
ORDER BY "displayOrder" ASC NULLS LAST, "createdAt" DESC;
```

### Get Active Promos for Homepage
```sql
SELECT * FROM "FreshNear"."Discount"
WHERE "isMarketingPromo" = true
AND "isActive" = true
AND "startDate" <= NOW()
AND "endDate" >= NOW()
AND "deletedAt" IS NULL
ORDER BY "displayOrder" ASC NULLS LAST, "createdAt" DESC;
```

## Future Enhancements

1. **Link to Actual Discounts**: Allow marketing promos to link to actual discount codes
2. **Click Analytics**: Track promo banner clicks
3. **A/B Testing**: Show different banners to different users
4. **Responsive Images**: Multiple image sizes for different devices
5. **Video Support**: Allow video uploads for animated jumbotrons
6. **Scheduling**: Advanced scheduling with recurring promos
7. **Target Audience**: Show promos based on user location/preferences
