# Inventory Management API Documentation

## Overview

The inventory management system provides comprehensive stock tracking, movement logging, and reporting capabilities for the grocery app. It supports different access levels for Super Admins and Store Admins.

## Base URL

```
/inventory
```

## Authentication

All inventory endpoints require admin authentication:

- **Super Admin**: Can manage inventory for all stores
- **Store Admin**: Can only manage inventory for their assigned store

## Endpoints

### 1. Update Stock

Update stock for a single product with automatic journal logging.

**Endpoint:** `POST /inventory/stock/update`

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
	"productId": "product-uuid",
	"storeId": "store-uuid", // Optional for Store Admins (auto-assigned)
	"quantity": 50,
	"type": "IN", // IN, OUT, ADJUSTMENT, TRANSFER, INITIAL
	"notes": "Restocking from supplier" // Optional
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Stock updated successfully",
	"data": {
		"storeId": "store-uuid",
		"productId": "product-uuid",
		"stock": 150,
		"minStock": 5,
		"createdAt": "2025-09-08T03:37:23.000Z",
		"updatedAt": "2025-09-08T03:45:12.000Z"
	}
}
```

### 2. Bulk Stock Update

Update stock for multiple products in a single transaction.

**Endpoint:** `POST /inventory/stock/bulk-update`

**Request Body:**

```json
{
	"storeId": "store-uuid", // Optional for Store Admins
	"items": [
		{
			"productId": "product-1-uuid",
			"quantity": 20,
			"type": "IN",
			"notes": "Weekly restock"
		},
		{
			"productId": "product-2-uuid",
			"quantity": 15,
			"type": "ADJUSTMENT",
			"notes": "Physical count correction"
		}
	]
}
```

**Response:**

```json
{
	"status": "success",
	"message": "2 products updated successfully",
	"data": [
		{
			"storeId": "store-uuid",
			"productId": "product-1-uuid",
			"stock": 120,
			"minStock": 10,
			"updatedAt": "2025-09-08T03:45:12.000Z"
		},
		{
			"storeId": "store-uuid",
			"productId": "product-2-uuid",
			"stock": 85,
			"minStock": 5,
			"updatedAt": "2025-09-08T03:45:13.000Z"
		}
	]
}
```

### 3. Transfer Stock Between Stores

Transfer stock from one store to another (Super Admin only).

**Endpoint:** `POST /inventory/transfer`

**Request Body:**

```json
{
	"fromStoreId": "store-1-uuid",
	"toStoreId": "store-2-uuid",
	"productId": "product-uuid",
	"quantity": 10,
	"notes": "Low stock at Store 2" // Optional
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Stock transferred successfully",
	"data": {
		"fromStore": {
			"storeId": "store-1-uuid",
			"productId": "product-uuid",
			"stock": 90
		},
		"toStore": {
			"storeId": "store-2-uuid",
			"productId": "product-uuid",
			"stock": 25
		}
	}
}
```

### 4. Set Minimum Stock Level

Set the minimum stock threshold for inventory alerts.

**Endpoint:** `PUT /inventory/min-stock`

**Request Body:**

```json
{
	"productId": "product-uuid",
	"storeId": "store-uuid", // Optional for Store Admins
	"minStock": 10
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Minimum stock level updated successfully",
	"data": {
		"storeId": "store-uuid",
		"productId": "product-uuid",
		"stock": 45,
		"minStock": 10,
		"updatedAt": "2025-09-08T03:45:12.000Z"
	}
}
```

### 5. Get Stock Journal

Retrieve stock movement history with filtering options.

**Endpoint:** `GET /inventory/journal`

**Query Parameters:**

```
?storeId=store-uuid          // Optional for Super Admin
&productId=product-uuid      // Filter by specific product
&adminId=admin-uuid          // Filter by admin who made changes
&type=IN                     // Filter by movement type
&dateFrom=2025-09-01         // Filter from date (YYYY-MM-DD)
&dateTo=2025-09-08           // Filter to date (YYYY-MM-DD)
&page=1                      // Page number (default: 1)
&limit=20                    // Items per page (default: 20)
```

**Response:**

```json
{
	"status": "success",
	"data": {
		"data": [
			{
				"id": "journal-uuid",
				"storeId": "store-uuid",
				"productId": "product-uuid",
				"type": "IN",
				"quantity": 50,
				"beforeStock": 100,
				"afterStock": 150,
				"notes": "Weekly restock",
				"createdAt": "2025-09-08T03:45:12.000Z",
				"storeProduct": {
					"product": {
						"id": "product-uuid",
						"name": "Fresh Apples",
						"picture1": "apple-image.jpg"
					},
					"store": {
						"id": "store-uuid",
						"name": "Jakarta Store"
					}
				},
				"admin": {
					"id": "admin-uuid",
					"name": "John Doe",
					"email": "john@groceryapp.com"
				},
				"transaction": null
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 150,
			"totalPages": 8
		}
	}
}
```

### 6. Get Inventory Summary

Get comprehensive inventory statistics for a store.

**Endpoint:** `GET /inventory/summary`

**Query Parameters:**

```
?storeId=store-uuid  // Required for Super Admin, auto-assigned for Store Admins
```

**Response:**

```json
{
	"status": "success",
	"data": {
		"totalProducts": 45,
		"totalStock": 2350,
		"lowStockProducts": 5,
		"outOfStockProducts": 2,
		"recentMovements": 23,
		"stockByCategory": [
			{
				"categoryId": "category-1-uuid",
				"categoryName": "Fresh Fruits",
				"totalStock": 450,
				"productCount": 12
			},
			{
				"categoryId": "category-2-uuid",
				"categoryName": "Vegetables",
				"totalStock": 320,
				"productCount": 8
			}
		]
	}
}
```

### 7. Get Low Stock Alerts

Get products that are below minimum stock levels.

**Endpoint:** `GET /inventory/low-stock`

**Query Parameters:**

```
?storeId=store-uuid  // Required for Super Admin, auto-assigned for Store Admins
```

**Response:**

```json
{
	"status": "success",
	"data": [
		{
			"storeId": "store-uuid",
			"productId": "product-uuid",
			"stock": 3,
			"minStock": 10,
			"isOutOfStock": false,
			"alertLevel": "warning",
			"product": {
				"id": "product-uuid",
				"name": "Fresh Bananas",
				"picture1": "banana-image.jpg",
				"price": 15000,
				"category": {
					"id": "category-uuid",
					"name": "Fresh Fruits"
				}
			},
			"createdAt": "2025-09-01T10:00:00.000Z",
			"updatedAt": "2025-09-08T03:45:12.000Z"
		}
	]
}
```

## Stock Movement Types

| Type         | Description                   | Usage                                          |
| ------------ | ----------------------------- | ---------------------------------------------- |
| `IN`         | Stock increase                | Receiving new inventory from suppliers         |
| `OUT`        | Stock decrease                | Sales, damages, or manual removals             |
| `ADJUSTMENT` | Direct stock correction       | Setting exact stock level after physical count |
| `TRANSFER`   | Stock movement between stores | Moving inventory from one store to another     |
| `INITIAL`    | Initial stock setup           | Setting up stock for new products              |

## Permission Matrix

| Action                   | Super Admin | Store Admin    |
| ------------------------ | ----------- | -------------- |
| Update stock (any store) | ✅          | ❌             |
| Update stock (own store) | ✅          | ✅             |
| Transfer between stores  | ✅          | ❌             |
| View journal (any store) | ✅          | ❌             |
| View journal (own store) | ✅          | ✅             |
| Set minimum stock        | ✅          | ✅ (own store) |
| View inventory summary   | ✅          | ✅ (own store) |
| View low stock alerts    | ✅          | ✅ (own store) |

## Error Responses

### 400 Bad Request

```json
{
	"status": "error",
	"message": "Invalid stock movement type"
}
```

### 403 Forbidden

```json
{
	"status": "error",
	"message": "Admin can only manage inventory for their assigned store"
}
```

### 404 Not Found

```json
{
	"status": "error",
	"message": "Product not found or inactive"
}
```

### 500 Internal Server Error

```json
{
	"status": "error",
	"message": "Internal server error"
}
```

## Integration Notes

1. **Automatic Journal Logging**: All stock changes are automatically logged with admin information, timestamps, and before/after stock levels.

2. **Transaction Safety**: Stock updates are wrapped in database transactions to ensure data consistency.

3. **Store Admin Restrictions**: Store admins are automatically restricted to their assigned store and cannot specify different store IDs.

4. **Stock Validation**: The system prevents negative stock levels for OUT and TRANSFER operations.

5. **Low Stock Monitoring**: Products below their minimum stock levels trigger alerts in the dashboard.

6. **Audit Trail**: Complete audit trail with admin attribution for all inventory changes.
