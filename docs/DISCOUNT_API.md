# Discount Management API Documentation

## Overview

The discount management system provides comprehensive discount creation, management, and reporting capabilities for the grocery app. It supports different types of discounts including manual discounts, minimum purchase requirements, and Buy One Get One (BOGO) offers.

## Base URL

```
/discounts
```

## Authentication

All discount endpoints require admin authentication:

- **Super Admin**: Can manage discounts for all stores
- **Store Admin**: Can only manage discounts for their assigned store

## Discount Types

| Type               | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `MANUAL`           | Can be applied manually by admin                                |
| `MINIMUM_PURCHASE` | Requires minimum transaction value                              |
| `BOGO`             | Buy One Get One offers                                          |
| `REGULAR`          | Regular discount, automatically applied when conditions are met |

## Discount Value Types

| Type         | Description                    |
| ------------ | ------------------------------ |
| `PERCENTAGE` | Discount in percentage (1-100) |
| `NOMINAL`    | Fixed amount discount          |

## Endpoints

### 1. Create Discount

Create a new discount with specified conditions and products.

**Endpoint:** `POST /discounts`

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
	"name": "Weekend Special",
	"description": "20% off on fresh fruits",
	"type": "REGULAR",
	"valueType": "PERCENTAGE",
	"value": 20,
	"maxDiscountAmount": 50000,
	"minTransactionValue": 100000,
	"maxUsagePerCustomer": 1,
	"totalUsageLimit": 100,
	"startDate": "2025-09-10T00:00:00.000Z",
	"endDate": "2025-09-12T23:59:59.000Z",
	"productIds": ["product-1-uuid", "product-2-uuid"],
	"storeId": "store-uuid" // Optional for Store Admins (auto-assigned)
}
```

**BOGO Discount Example:**

```json
{
	"name": "Buy 2 Get 1 Free",
	"description": "Get 1 free for every 2 bananas purchased",
	"type": "BOGO",
	"valueType": "PERCENTAGE",
	"value": 100,
	"startDate": "2025-09-10T00:00:00.000Z",
	"endDate": "2025-09-12T23:59:59.000Z",
	"productIds": ["banana-product-uuid"],
	"buyQuantity": 2,
	"getQuantity": 1,
	"applyToSameProduct": true,
	"maxBogoSets": 3
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Discount created successfully",
	"data": {
		"id": "discount-uuid",
		"storeId": "store-uuid",
		"name": "Weekend Special",
		"description": "20% off on fresh fruits",
		"type": "REGULAR",
		"valueType": "PERCENTAGE",
		"value": 20,
		"maxDiscountAmount": 50000,
		"minTransactionValue": 100000,
		"maxUsagePerCustomer": 1,
		"totalUsageLimit": 100,
		"currentUsageCount": 0,
		"isActive": true,
		"startDate": "2025-09-10T00:00:00.000Z",
		"endDate": "2025-09-12T23:59:59.000Z",
		"createdAt": "2025-09-09T06:02:43.000Z",
		"updatedAt": "2025-09-09T06:02:43.000Z",
		"adminId": "admin-uuid"
	}
}
```

### 2. Update Discount

Update an existing discount. Store admins can only update discounts for their store.

**Endpoint:** `PUT /discounts/:discountId`

**Request Body:**

```json
{
	"name": "Updated Weekend Special",
	"value": 25,
	"maxDiscountAmount": 75000,
	"isActive": false
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Discount updated successfully",
	"data": {
		"id": "discount-uuid",
		"name": "Updated Weekend Special",
		"value": 25,
		"maxDiscountAmount": 75000,
		"isActive": false,
		"updatedAt": "2025-09-09T06:30:00.000Z"
	}
}
```

### 3. Delete Discount

Soft delete a discount. Store admins can only delete discounts for their store.

**Endpoint:** `DELETE /discounts/:discountId`

**Response:**

```json
{
	"status": "success",
	"message": "Discount deleted successfully"
}
```

### 4. Get All Discounts

Retrieve discounts with filtering options.

**Endpoint:** `GET /discounts`

**Query Parameters:**

```
?storeId=store-uuid          // Optional for Super Admin (auto-set for Store Admin)
&type=REGULAR              // Filter by discount type
&isActive=true               // Filter by active status
&dateFrom=2025-09-01         // Filter from date
&dateTo=2025-09-30           // Filter to date
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
				"id": "discount-uuid",
				"storeId": "store-uuid",
				"name": "Weekend Special",
				"description": "20% off on fresh fruits",
				"type": "REGULAR",
				"valueType": "PERCENTAGE",
				"value": 20,
				"maxDiscountAmount": 50000,
				"minTransactionValue": 100000,
				"maxUsagePerCustomer": 1,
				"totalUsageLimit": 100,
				"currentUsageCount": 5,
				"isActive": true,
				"startDate": "2025-09-10T00:00:00.000Z",
				"endDate": "2025-09-12T23:59:59.000Z",
				"createdAt": "2025-09-09T06:02:43.000Z",
				"updatedAt": "2025-09-09T06:02:43.000Z",
				"store": {
					"id": "store-uuid",
					"name": "Jakarta Store"
				},
				"admin": {
					"id": "admin-uuid",
					"name": "John Doe",
					"email": "john@groceryapp.com"
				},
				"products": [
					{
						"id": "dp-uuid",
						"product": {
							"id": "product-uuid",
							"name": "Fresh Apples",
							"picture1": "apple-image.jpg",
							"price": 25000
						}
					}
				],
				"bogoConfig": null,
				"_count": {
					"usageHistory": 5
				}
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 15,
			"totalPages": 1
		}
	}
}
```

### 5. Get Discount by ID

Retrieve detailed information about a specific discount.

**Endpoint:** `GET /discounts/:discountId`

**Response:**

```json
{
	"status": "success",
	"data": {
		"id": "discount-uuid",
		"storeId": "store-uuid",
		"name": "Buy 2 Get 1 Free",
		"description": "Get 1 free for every 2 bananas purchased",
		"type": "BOGO",
		"valueType": "PERCENTAGE",
		"value": 100,
		"isActive": true,
		"startDate": "2025-09-10T00:00:00.000Z",
		"endDate": "2025-09-12T23:59:59.000Z",
		"createdAt": "2025-09-09T06:02:43.000Z",
		"store": {
			"id": "store-uuid",
			"name": "Jakarta Store"
		},
		"admin": {
			"id": "admin-uuid",
			"name": "Jane Admin",
			"email": "jane@groceryapp.com"
		},
		"products": [
			{
				"product": {
					"id": "banana-uuid",
					"name": "Fresh Bananas",
					"picture1": "banana-image.jpg",
					"price": 15000
				}
			}
		],
		"bogoConfig": {
			"id": "bogo-uuid",
			"buyQuantity": 2,
			"getQuantity": 1,
			"applyToSameProduct": true,
			"maxBogoSets": 3
		},
		"usageHistory": [
			{
				"id": "usage-uuid",
				"usedAt": "2025-09-09T08:30:00.000Z",
				"discountValue": 15000,
				"orderTotal": 45000,
				"user": {
					"id": "user-uuid",
					"name": "Customer Name",
					"email": "customer@email.com"
				},
				"appliedBy": null
			}
		],
		"_count": {
			"usageHistory": 8
		}
	}
}
```

### 6. Apply Discount Manually

Manually apply a discount (for admin use, e.g., customer service).

**Endpoint:** `POST /discounts/apply`

**Request Body:**

```json
{
	"discountId": "discount-uuid",
	"transactionId": "transaction-uuid", // Optional
	"userId": "user-uuid", // Optional
	"orderTotal": 150000
}
```

**Response:**

```json
{
	"status": "success",
	"message": "Discount applied successfully",
	"data": {
		"discountValue": 30000,
		"discountName": "Weekend Special",
		"usageHistory": {
			"id": "usage-uuid",
			"discountId": "discount-uuid",
			"transactionId": "transaction-uuid",
			"userId": "user-uuid",
			"adminId": "admin-uuid",
			"usedAt": "2025-09-09T09:00:00.000Z",
			"discountValue": 30000,
			"orderTotal": 150000
		}
	}
}
```

### 7. Get Discount Usage Report

Retrieve comprehensive discount usage statistics and history.

**Endpoint:** `GET /discounts/report/usage`

**Query Parameters:**

```
?storeId=store-uuid          // Optional for Super Admin
&dateFrom=2025-09-01         // Filter from date
&dateTo=2025-09-30           // Filter to date
&page=1                      // Page number
&limit=20                    // Items per page
```

**Response:**

```json
{
	"status": "success",
	"data": {
		"data": [
			{
				"id": "usage-uuid",
				"discountId": "discount-uuid",
				"transactionId": "transaction-uuid",
				"userId": "user-uuid",
				"adminId": null,
				"usedAt": "2025-09-09T08:30:00.000Z",
				"discountValue": 25000,
				"orderTotal": 125000,
				"discount": {
					"id": "discount-uuid",
					"name": "Weekend Special",
					"type": "REGULAR",
					"valueType": "PERCENTAGE",
					"value": 20,
					"store": {
						"id": "store-uuid",
						"name": "Jakarta Store"
					}
				},
				"user": {
					"id": "user-uuid",
					"name": "Customer Name",
					"email": "customer@email.com"
				},
				"appliedBy": null
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 45,
			"totalPages": 3
		},
		"summary": {
			"totalDiscountGiven": 875000,
			"totalOrderValue": 4500000,
			"totalUsages": 45,
			"averageDiscountPerOrder": 19444
		}
	}
}
```

### 8. Get Available Discounts for Customers

Get applicable discounts for a specific order (public endpoint for frontend).

**Endpoint:** `GET /discounts/available/public`

**Query Parameters:**

```
?storeId=store-uuid
&orderTotal=150000
&productIds=product-1-uuid,product-2-uuid
```

**Response:**

```json
{
	"status": "success",
	"data": [
		{
			"id": "discount-uuid",
			"name": "Weekend Special",
			"description": "20% off on fresh fruits",
			"type": "REGULAR",
			"valueType": "PERCENTAGE",
			"value": 20,
			"maxDiscountAmount": 50000,
			"minTransactionValue": 100000,
			"potentialSavings": 30000,
			"products": [
				{
					"product": {
						"id": "product-uuid",
						"name": "Fresh Apples",
						"picture1": "apple-image.jpg"
					}
				}
			],
			"bogoConfig": null
		},
		{
			"id": "bogo-discount-uuid",
			"name": "Buy 2 Get 1 Free",
			"description": "Get 1 free banana for every 2 purchased",
			"type": "BOGO",
			"valueType": "PERCENTAGE",
			"value": 100,
			"potentialSavings": 15000,
			"products": [
				{
					"product": {
						"id": "banana-uuid",
						"name": "Fresh Bananas",
						"picture1": "banana-image.jpg"
					}
				}
			],
			"bogoConfig": {
				"buyQuantity": 2,
				"getQuantity": 1,
				"applyToSameProduct": true,
				"maxBogoSets": 3
			}
		}
	]
}
```

## Permission Matrix

| Action                        | Super Admin | Store Admin |
| ----------------------------- | ----------- | ----------- |
| Create discount (any store)   | ✅          | ❌          |
| Create discount (own store)   | ✅          | ✅          |
| Update discount (any store)   | ✅          | ❌          |
| Update discount (own store)   | ✅          | ✅          |
| Delete discount (any store)   | ✅          | ❌          |
| Delete discount (own store)   | ✅          | ✅          |
| View discounts (any store)    | ✅          | ❌          |
| View discounts (own store)    | ✅          | ✅          |
| Apply discount manually       | ✅          | ✅          |
| View usage report (any store) | ✅          | ❌          |
| View usage report (own store) | ✅          | ✅          |

## Error Responses

### 400 Bad Request

```json
{
	"status": "error",
	"message": "Value must be a positive number"
}
```

### 401 Unauthorized

```json
{
	"status": "error",
	"message": "Authentication required"
}
```

### 403 Forbidden

```json
{
	"status": "error",
	"message": "You can only edit discounts for your store"
}
```

### 404 Not Found

```json
{
	"status": "error",
	"message": "Discount not found"
}
```

### 500 Internal Server Error

```json
{
	"status": "error",
	"message": "Failed to create discount"
}
```

## Integration Notes

1. **Automatic Discount Application**: The system can automatically apply applicable discounts during checkout based on cart contents and order value.

2. **Usage Tracking**: All discount applications are tracked with complete audit trail including admin attribution for manual applications.

3. **BOGO Logic**: Buy One Get One discounts can be configured for same product or different products with flexible quantity ratios.

4. **Store Isolation**: Store admins are automatically restricted to their assigned store and cannot access or modify discounts for other stores.

5. **Validation**: Comprehensive validation ensures discount integrity including date ranges, value limits, and product availability.

6. **Reporting**: Detailed usage reports provide insights into discount effectiveness and ROI.

## Example Workflows

### Creating a Simple Percentage Discount

1. Store admin creates 15% discount on vegetables
2. Sets minimum purchase of 50,000 IDR
3. Assigns to specific vegetable products
4. Sets validity period for one week

### Setting up BOGO Offer

1. Super admin creates "Buy 2 Get 1" promotion
2. Configures for dairy products
3. Sets maximum 2 BOGO sets per customer
4. Tracks usage and effectiveness

### Manual Discount Application

1. Customer calls support for price match
2. Admin applies manual discount to order
3. System records admin who applied discount
4. Usage is tracked in reports

This comprehensive discount management system provides flexibility for various promotional strategies while maintaining strict access controls and comprehensive audit trails.
