# 📊 Report & Analysis API Documentation

## Overview

The Report & Analysis system provides comprehensive business intelligence for FreshNear grocery stores, including sales performance tracking and inventory management insights.

## Features

- **Role-based Access Control**: Super Admins see all stores, Store Admins see only their assigned store
- **Sales Analytics**: Monthly sales, category-wise analysis, product performance
- **Stock Management**: Inventory movements, low stock alerts, trend analysis
- **Dashboard Insights**: Key metrics and performance indicators

---

## 🔐 Authentication

All report endpoints require admin authentication:

```
Authorization: Bearer <admin_jwt_token>
```

**Access Levels:**

- **Super Admin**: Can view reports for any store by specifying `storeId` parameter
- **Store Admin**: Automatically limited to their assigned store only

---

## 📈 Sales Reports

### 1. Monthly Sales Summary

Get comprehensive sales overview for a specific month.

**Endpoint:** `GET /reports/sales/monthly`

**Query Parameters:**

- `storeId` (optional): Specific store ID (Super Admin only)
- `month` (optional): Month number (1-12), defaults to current month
- `year` (optional): Year, defaults to current year

**Example Request:**

```http
GET /reports/sales/monthly?storeId=store-uuid&month=9&year=2025
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
	"success": true,
	"message": "Monthly sales report retrieved successfully",
	"data": {
		"period": "September 2025",
		"summary": {
			"totalSales": 15750000,
			"totalTransactions": 245,
			"averageOrderValue": 64285
		},
		"topProducts": [
			{
				"productId": "product-uuid",
				"productName": "Fresh Bananas",
				"categoryName": "Fruits",
				"totalQuantitySold": 150,
				"totalRevenue": 750000
			}
		],
		"dailySales": [
			{
				"date": "2025-09-01",
				"transaction_count": 12,
				"total_sales": 850000
			}
		],
		"storeFilter": "store-uuid"
	}
}
```

### 2. Sales by Categories

Analyze sales performance across product categories.

**Endpoint:** `GET /reports/sales/categories`

**Query Parameters:**

- `storeId` (optional): Specific store ID (Super Admin only)
- `month` (optional): Month number (1-12)
- `year` (optional): Year

**Example Request:**

```http
GET /reports/sales/categories?month=9&year=2025
```

**Response:**

```json
{
	"success": true,
	"message": "Sales by categories report retrieved successfully",
	"data": {
		"period": "September 2025",
		"categories": [
			{
				"category_id": "cat-uuid",
				"category_name": "Fruits",
				"transaction_count": 85,
				"total_quantity_sold": 450,
				"total_revenue": 3250000,
				"average_order_value": 38235
			},
			{
				"category_id": "cat-uuid-2",
				"category_name": "Vegetables",
				"transaction_count": 92,
				"total_quantity_sold": 380,
				"total_revenue": 2850000,
				"average_order_value": 30978
			}
		],
		"storeFilter": null
	}
}
```

### 3. Sales by Products

Detailed product-level sales analysis.

**Endpoint:** `GET /reports/sales/products`

**Query Parameters:**

- `storeId` (optional): Specific store ID (Super Admin only)
- `productId` (optional): Specific product ID for detailed analysis
- `month` (optional): Month number (1-12)
- `year` (optional): Year

**Example Request:**

```http
GET /reports/sales/products?productId=product-uuid&month=9
```

**Response:**

```json
{
	"success": true,
	"message": "Sales by products report retrieved successfully",
	"data": {
		"period": "September 2025",
		"products": [
			{
				"productId": "product-uuid",
				"productName": "Fresh Bananas",
				"categoryName": "Fruits",
				"totalQuantitySold": 150,
				"totalRevenue": 750000,
				"transactionCount": 45,
				"averageOrderValue": 16667,
				"currentStock": 85,
				"currentPrice": 5000
			}
		],
		"storeFilter": "store-uuid"
	}
}
```

---

## 📦 Stock Reports

### 1. Monthly Stock Movement Summary

Overview of all inventory changes for a specific month.

**Endpoint:** `GET /reports/stock/monthly`

**Query Parameters:**

- `storeId` (optional): Specific store ID (Super Admin only)
- `month` (optional): Month number (1-12)
- `year` (optional): Year

**Example Request:**

```http
GET /reports/stock/monthly?month=9&year=2025
```

**Response:**

```json
{
	"success": true,
	"message": "Monthly stock report retrieved successfully",
	"data": {
		"period": "September 2025",
		"summary": {
			"totalMovements": 156,
			"uniqueProducts": 45,
			"totalQuantityMoved": 2350
		},
		"movementsByType": [
			{
				"type": "IN",
				"quantity": 1250,
				"count": 45
			},
			{
				"type": "OUT",
				"quantity": 980,
				"count": 98
			},
			{
				"type": "ADJUSTMENT",
				"quantity": 120,
				"count": 13
			}
		],
		"productMovements": [
			{
				"productId": "product-uuid",
				"productName": "Fresh Bananas",
				"categoryName": "Fruits",
				"storeId": "store-uuid",
				"totalQuantityMoved": 85,
				"movementCount": 12
			}
		],
		"lowStockAlerts": [
			{
				"productId": "product-uuid",
				"productName": "Organic Apples",
				"categoryName": "Fruits",
				"storeId": "store-uuid",
				"storeName": "FreshNear Downtown",
				"currentStock": 3,
				"status": "LOW_STOCK"
			}
		],
		"storeFilter": "store-uuid"
	}
}
```

### 2. Product Stock Report

Detailed stock movement history for a specific product.

**Endpoint:** `GET /reports/stock/product/:productId`

**Path Parameters:**

- `productId`: Product ID to analyze

**Query Parameters:**

- `storeId` (optional): Specific store ID (Super Admin only)
- `month` (optional): Month number (1-12)
- `year` (optional): Year

**Example Request:**

```http
GET /reports/stock/product/product-uuid?month=9
```

**Response:**

```json
{
	"success": true,
	"message": "Product stock report retrieved successfully",
	"data": {
		"period": "September 2025",
		"product": {
			"id": "product-uuid",
			"name": "Fresh Bananas",
			"categoryName": "Fruits"
		},
		"summary": {
			"totalIn": 200,
			"totalOut": 150,
			"netChange": 50,
			"totalMovements": 15
		},
		"currentStock": [
			{
				"storeId": "store-uuid",
				"storeName": "FreshNear Downtown",
				"currentStock": 85
			}
		],
		"movements": [
			{
				"id": "movement-uuid",
				"date": "2025-09-15T10:30:00.000Z",
				"type": "OUT",
				"quantity": -25,
				"beforeStock": 110,
				"afterStock": 85,
				"adminName": "John Doe",
				"notes": "Customer purchase",
				"transactionId": "trans-uuid",
				"transactionStatus": "confirmed"
			}
		],
		"storeFilter": "store-uuid"
	}
}
```

### 3. Stock Movement Trends

Historical stock movement analysis over multiple months.

**Endpoint:** `GET /reports/stock/trends`

**Query Parameters:**

- `storeId` (optional): Specific store ID (Super Admin only)
- `months` (optional): Number of months to analyze (default: 6)

**Example Request:**

```http
GET /reports/stock/trends?months=12
```

**Response:**

```json
{
	"success": true,
	"message": "Stock trends report retrieved successfully",
	"data": {
		"trends": [
			{
				"period": "March 2025",
				"data": [
					{
						"type": "IN",
						"quantity": 850,
						"count": 25
					},
					{
						"type": "OUT",
						"quantity": 720,
						"count": 65
					}
				]
			}
		],
		"storeFilter": null
	}
}
```

---

## 📊 Dashboard

### Dashboard Summary

Get key metrics and insights for admin dashboard.

**Endpoint:** `GET /reports/dashboard`

**Query Parameters:**

- `storeId` (optional): Specific store ID (Super Admin only)

**Example Request:**

```http
GET /reports/dashboard?storeId=store-uuid
```

**Response:**

```json
{
	"success": true,
	"message": "Dashboard report retrieved successfully",
	"data": {
		"sales": {
			"period": "September 2025",
			"summary": {
				"totalSales": 15750000,
				"totalTransactions": 245,
				"averageOrderValue": 64285
			},
			"topProducts": [
				{
					"productId": "product-uuid",
					"productName": "Fresh Bananas",
					"categoryName": "Fruits",
					"totalQuantitySold": 150,
					"totalRevenue": 750000
				}
			]
		},
		"stock": {
			"period": "September 2025",
			"summary": {
				"totalMovements": 156,
				"uniqueProducts": 45,
				"totalQuantityMoved": 2350
			},
			"lowStockAlerts": [
				{
					"productId": "product-uuid",
					"productName": "Organic Apples",
					"categoryName": "Fruits",
					"storeId": "store-uuid",
					"storeName": "FreshNear Downtown",
					"currentStock": 3,
					"status": "LOW_STOCK"
				}
			],
			"movementsByType": [
				{
					"type": "IN",
					"quantity": 1250,
					"count": 45
				}
			]
		}
	}
}
```

---

## 🔒 Role-Based Access Control

### Super Admin Access

- Can view reports for any store by specifying `storeId` parameter
- Can access cross-store analytics
- Has access to all report endpoints

### Store Admin Access

- Automatically filtered to their assigned store only
- Cannot specify `storeId` parameter (ignored if provided)
- Limited to their store's data only

---

## 📋 Query Parameters Reference

| Parameter   | Type    | Description                   | Example                                |
| ----------- | ------- | ----------------------------- | -------------------------------------- |
| `storeId`   | string  | Store UUID (Super Admin only) | `7658f570-f8a7-4fb4-901a-433a21047108` |
| `month`     | integer | Month number (1-12)           | `9` for September                      |
| `year`      | integer | Year                          | `2025`                                 |
| `productId` | string  | Product UUID                  | `product-uuid-here`                    |
| `months`    | integer | Number of months for trends   | `6`                                    |

---

## 🚨 Error Responses

### Authentication Errors

```json
{
	"success": false,
	"message": "Admin authentication required",
	"statusCode": 401
}
```

### Authorization Errors

```json
{
	"success": false,
	"message": "Access denied. You can only view reports for your assigned store",
	"statusCode": 403
}
```

### Not Found Errors

```json
{
	"success": false,
	"message": "Product not found",
	"statusCode": 404
}
```

---

## 💡 Usage Examples

### Example 1: Monthly Sales Dashboard

```javascript
// Get current month sales for store admin
const response = await fetch('/reports/sales/monthly', {
	headers: {
		Authorization: 'Bearer ' + adminToken,
	},
});

// Get specific store sales for super admin
const response = await fetch(
	'/reports/sales/monthly?storeId=store-uuid&month=8&year=2025',
	{
		headers: {
			Authorization: 'Bearer ' + superAdminToken,
		},
	}
);
```

### Example 2: Stock Monitoring

```javascript
// Check low stock alerts
const dashboard = await fetch('/reports/dashboard', {
	headers: {
		Authorization: 'Bearer ' + adminToken,
	},
});

const lowStockItems = dashboard.data.stock.lowStockAlerts;
```

### Example 3: Product Performance Analysis

```javascript
// Analyze specific product performance
const productReport = await fetch(
	'/reports/sales/products?productId=product-uuid&month=9',
	{
		headers: {
			Authorization: 'Bearer ' + adminToken,
		},
	}
);

// Get detailed stock movements for the product
const stockReport = await fetch('/reports/stock/product/product-uuid?month=9', {
	headers: {
		Authorization: 'Bearer ' + adminToken,
	},
});
```

---

## 🎯 Business Intelligence Features

### Sales Analytics

- **Revenue Tracking**: Monitor total sales and average order values
- **Product Performance**: Identify top-selling products and categories
- **Trend Analysis**: Track daily/monthly sales patterns
- **Category Insights**: Compare performance across product categories

### Inventory Management

- **Stock Movement Tracking**: Monitor all inventory changes
- **Low Stock Alerts**: Automatic warnings for items below threshold
- **Movement Analysis**: Track IN/OUT/ADJUSTMENT patterns
- **Product-level Details**: Detailed movement history per product

### Dashboard Intelligence

- **Key Metrics**: Quick overview of critical performance indicators
- **Alert System**: Immediate visibility of issues requiring attention
- **Performance Comparison**: Cross-category and cross-product analysis
- **Actionable Insights**: Data-driven recommendations for business decisions

The Report & Analysis system provides comprehensive business intelligence to help store managers and administrators make informed decisions about inventory, sales, and overall business performance.
