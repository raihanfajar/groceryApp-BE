# Discount Management API Test Guide

## 🔧 Quick Debugging Steps

### 1. Test Admin Login (Use POST!)

```bash
POST http://localhost:8000/admin/login
Content-Type: application/json

{
  "email": "superadmin@groceryapp.com",
  "password": "superadmin123"
}
```

**Expected Response:**

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "admin": { "id": "...", "name": "Super Administrator", ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Test Public Discount Endpoint (No Auth Required)

```bash
GET http://localhost:8000/discounts/available/public?storeId=STORE_UUID&orderTotal=150000&productIds=PRODUCT_UUID1,PRODUCT_UUID2
```

### 3. Test Protected Discount Endpoints (With Token)

Extract the token from login response and use it in Authorization header:

#### Create Discount

```bash
POST http://localhost:8000/discounts
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Test Weekend Special",
  "description": "20% off on fresh fruits",
  "type": "AUTOMATIC",
  "valueType": "PERCENTAGE",
  "value": 20,
  "maxDiscountAmount": 50000,
  "minTransactionValue": 100000,
  "startDate": "2025-09-10T00:00:00.000Z",
  "endDate": "2025-09-12T23:59:59.000Z",
  "productIds": ["PRODUCT_UUID_HERE"]
}
```

#### Get All Discounts

```bash
GET http://localhost:8000/discounts
Authorization: Bearer YOUR_TOKEN_HERE
```

#### Create BOGO Discount

```bash
POST http://localhost:8000/discounts
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Buy 2 Get 1 Free Test",
  "description": "Get 1 free for every 2 bananas",
  "type": "BOGO",
  "valueType": "PERCENTAGE",
  "value": 100,
  "startDate": "2025-09-10T00:00:00.000Z",
  "endDate": "2025-09-12T23:59:59.000Z",
  "productIds": ["BANANA_PRODUCT_UUID"],
  "buyQuantity": 2,
  "getQuantity": 1,
  "applyToSameProduct": true
}
```

## 🐛 Common Issues & Solutions

### Issue 1: "Token not provided"

- ✅ **Solution**: Use POST method for login, not GET
- ✅ **Solution**: Include `Authorization: Bearer TOKEN` header for protected endpoints

### Issue 2: "Invalid token"

- ✅ **Solution**: Make sure token is copied correctly from login response
- ✅ **Solution**: Token format should be: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Issue 3: "Some products not found"

- ✅ **Solution**: Use valid product UUIDs from your seeded data
- ✅ **Solution**: Check products exist in the specified store

### Issue 4: "Store ID is required for Super Admin"

- ✅ **Solution**: Super admin must specify storeId in request body
- ✅ **Solution**: Store admin gets storeId automatically from their profile

## 📋 Quick Product/Store UUIDs

To get actual UUIDs for testing, run these queries:

```sql
-- Get Store IDs
SELECT id, name FROM "Store";

-- Get Product IDs
SELECT id, name FROM "Product" LIMIT 10;

-- Get Store Products
SELECT sp."storeId", sp."productId", p.name
FROM "StoreProduct" sp
JOIN "Product" p ON sp."productId" = p.id
LIMIT 10;
```

## ✅ Fixed Issues

1. ✅ **Removed duplicate route**: `/available/public` was defined twice
2. ✅ **Fixed TypeScript errors**: Centralized AuthenticatedRequest interface
3. ✅ **Public endpoint**: `/available/public` now correctly bypasses authentication
4. ✅ **Route ordering**: Public routes defined before auth middleware

The discount management system should now work correctly! 🎉
