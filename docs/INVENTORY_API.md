# Inventory Management System API Documentation

## Overview

The Inventory Management System provides comprehensive stock control with the following features:

- **Different stocks for different stores**: Each store maintains its own inventory
- **Role-based access control**:
  - **Super Admin**: Can manage inventory across all stores
  - **Store Admin**: Can only manage inventory for their assigned store
- **Stock journal/history**: Complete audit trail of all stock movements
- **Stock movement types**: IN, OUT, ADJUSTMENT, TRANSFER, INITIAL
- **Low stock alerts**: Configurable minimum stock levels
- **Bulk operations**: Update multiple products at once

## Base URL

```
/inventory
```

## Authentication

All endpoints require admin authentication:

- Header: `Authorization: Bearer <token>`
- User must have admin role

## Stock Movement Types

| Type         | Description                          | Usage                        |
| ------------ | ------------------------------------ | ---------------------------- |
| `IN`         | Stock increase (receiving inventory) | Adding new stock             |
| `OUT`        | Stock decrease (sales, damages)      | Reducing stock               |
| `ADJUSTMENT` | Direct stock adjustment              | Correcting stock levels      |
| `TRANSFER`   | Inter-store transfer                 | Moving stock between stores  |
| `INITIAL`    | Initial stock setup                  | Setting up initial inventory |

## Endpoints

### 1. Update Stock (Single Product)

**POST** `/inventory/stock/update`

Update stock for a single product with journal entry.

**Request Body:**

```json
{
	"productId": "uuid",
	"storeId": "uuid", // Optional for Store Admins (auto-selected)
	"quantity": 50,
	"type": "IN", // IN, OUT, ADJUSTMENT, TRANSFER, INITIAL
	"notes": "Received new shipment" // Optional
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Stock updated successfully",
	"data": {
		"storeId": "uuid",
		"productId": "uuid",
		"stock": 75,
		"minStock": 5,
		"createdAt": "2025-09-08T10:30:00Z",
		"updatedAt": "2025-09-08T10:30:00Z"
	}
}
```

### 2. Bulk Stock Update

**POST** `/inventory/stock/bulk-update`

Update stock for multiple products at once.

**Request Body:**

```json
{
	"storeId": "uuid", // Optional for Store Admins
	"items": [
		{
			"productId": "uuid1",
			"quantity": 30,
			"type": "IN",
			"notes": "Weekly restock"
		},
		{
			"productId": "uuid2",
			"quantity": 15,
			"type": "ADJUSTMENT",
			"notes": "Inventory correction"
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
			"storeId": "uuid",
			"productId": "uuid1",
			"stock": 55,
			"minStock": 5,
			"updatedAt": "2025-09-08T10:30:00Z"
		},
		{
			"storeId": "uuid",
			"productId": "uuid2",
			"stock": 40,
			"minStock": 10,
			"updatedAt": "2025-09-08T10:30:00Z"
		}
	]
}
```

### 3. Transfer Stock Between Stores

**POST** `/inventory/transfer` _(Super Admin Only)_

Transfer stock from one store to another.

**Request Body:**

```json
{
	"fromStoreId": "uuid1",
	"toStoreId": "uuid2",
	"productId": "uuid",
	"quantity": 20,
	"notes": "Transfer to high-demand store"
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Stock transferred successfully",
	"data": {
		"fromStore": {
			"storeId": "uuid1",
			"productId": "uuid",
			"stock": 30
		},
		"toStore": {
			"storeId": "uuid2",
			"productId": "uuid",
			"stock": 70
		}
	}
}
```

### 4. Set Minimum Stock Level

**PUT** `/inventory/min-stock`

Set minimum stock level for low stock alerts.

**Request Body:**

```json
{
	"productId": "uuid",
	"storeId": "uuid", // Optional for Store Admins
	"minStock": 10
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Minimum stock level updated successfully",
	"data": {
		"storeId": "uuid",
		"productId": "uuid",
		"stock": 45,
		"minStock": 10,
		"updatedAt": "2025-09-08T10:30:00Z"
	}
}
```

### 5. Get Stock Journal

**GET** `/inventory/journal`

Get stock movement history with filters and pagination.

**Query Parameters:**

- `storeId` (string, optional): Filter by store (Super Admin only)
- `productId` (string, optional): Filter by product
- `adminId` (string, optional): Filter by admin who made changes
- `type` (string, optional): Filter by movement type
- `dateFrom` (string, optional): Start date (YYYY-MM-DD)
- `dateTo` (string, optional): End date (YYYY-MM-DD)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Response:**

```json
{
	"status": "success",
	"data": {
		"data": [
			{
				"id": "uuid",
				"storeId": "uuid",
				"productId": "uuid",
				"adminId": "uuid",
				"transactionId": null,
				"type": "IN",
				"quantity": 30,
				"beforeStock": 25,
				"afterStock": 55,
				"notes": "Weekly restock",
				"createdAt": "2025-09-08T10:30:00Z",
				"storeProduct": {
					"product": {
						"id": "uuid",
						"name": "Fresh Apples",
						"picture1": "https://example.com/apple.jpg"
					},
					"store": {
						"id": "uuid",
						"name": "Jakarta Central Store"
					}
				},
				"admin": {
					"id": "uuid",
					"name": "John Admin",
					"email": "john@example.com"
				}
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

**GET** `/inventory/summary`

Get comprehensive inventory overview for a store.

**Query Parameters:**

- `storeId` (string, optional): Store ID (Super Admin only, Store Admins auto-filtered)

**Response:**

```json
{
	"status": "success",
	"data": {
		"totalProducts": 156,
		"totalStock": 2847,
		"lowStockProducts": 12,
		"outOfStockProducts": 3,
		"recentMovements": 45,
		"stockByCategory": [
			{
				"categoryId": "uuid1",
				"categoryName": "Fresh Fruits",
				"totalStock": 890,
				"productCount": 45
			},
			{
				"categoryId": "uuid2",
				"categoryName": "Vegetables",
				"totalStock": 1205,
				"productCount": 67
			}
		]
	}
}
```

### 7. Get Low Stock Alerts

**GET** `/inventory/low-stock`

Get products with low or out-of-stock levels.

**Query Parameters:**

- `storeId` (string, optional): Store ID (Super Admin only)

**Response:**

```json
{
	"status": "success",
	"data": [
		{
			"storeId": "uuid",
			"productId": "uuid",
			"stock": 0,
			"minStock": 5,
			"isOutOfStock": true,
			"alertLevel": "critical",
			"product": {
				"id": "uuid",
				"name": "Premium Oranges",
				"picture1": "https://example.com/orange.jpg",
				"price": 25000,
				"category": {
					"id": "uuid",
					"name": "Fresh Fruits"
				}
			}
		},
		{
			"storeId": "uuid",
			"productId": "uuid2",
			"stock": 3,
			"minStock": 10,
			"isOutOfStock": false,
			"alertLevel": "warning",
			"product": {
				"id": "uuid2",
				"name": "Fresh Milk",
				"picture1": "https://example.com/milk.jpg",
				"price": 15000,
				"category": {
					"id": "uuid2",
					"name": "Dairy Products"
				}
			}
		}
	]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
	"status": "error",
	"message": "Error description",
	"code": 400
}
```

### Common Error Codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Admin Role Permissions

### Super Admin Can:

- ✅ View inventory for all stores
- ✅ Update stock for any store
- ✅ Transfer stock between stores
- ✅ View stock journal for all stores
- ✅ Set minimum stock levels for any store

### Store Admin Can:

- ✅ View inventory for their assigned store only
- ✅ Update stock for their assigned store only
- ❌ Transfer stock between stores
- ✅ View stock journal for their store only
- ✅ Set minimum stock levels for their store only

## Integration with Product Management

The inventory system is integrated with the existing product management:

- When updating stock via `/api/products/admin/:id/stock`, it automatically creates journal entries
- Stock movements are tracked when products are sold (transaction completion)
- Stock validation occurs when customers add items to cart

## Database Schema

### StoreProduct Table

```sql
- storeId: String (FK to Store)
- productId: String (FK to Product)
- stock: Int (current stock level)
- minStock: Int (minimum stock threshold)
- createdAt: DateTime
- updatedAt: DateTime
```

### StockJournal Table

```sql
- id: String (UUID, PK)
- storeId: String (FK to Store)
- productId: String (FK to Product)
- adminId: String (FK to Admin)
- transactionId: String (FK to Transaction, nullable)
- type: StockMovement (enum)
- quantity: Int (movement amount)
- beforeStock: Int (stock before movement)
- afterStock: Int (stock after movement)
- notes: String (optional description)
- createdAt: DateTime
```

## Best Practices

### For Stock Updates:

1. Always provide meaningful notes for stock movements
2. Use appropriate movement types (IN for receiving, OUT for sales, ADJUSTMENT for corrections)
3. Validate stock levels before allowing OUT movements
4. Set minimum stock levels to enable proper alerts

### For Store Admins:

1. Regularly check low stock alerts
2. Update minimum stock levels based on sales patterns
3. Use bulk updates for efficiency during restocking
4. Add detailed notes for audit trail

### For Super Admins:

1. Monitor stock across all stores via inventory summary
2. Use transfer functionality to balance stock between stores
3. Review stock journal regularly for unusual patterns
4. Set consistent minimum stock policies across stores
