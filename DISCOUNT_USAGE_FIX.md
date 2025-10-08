# Discount Usage Tracking Fix

## Issues Fixed

### 1. Discount Usage Not Being Recorded

**Problem**: When customers completed transactions using discounts, the usage was not tracked in the database.

**Root Cause**: The `_calculatePricesAndDiscounts` method in `transaction.service.ts` calculated and applied discounts but never created `DiscountUsageHistory` records.

**Solution**:

- Split the discount logic into two methods:
  1. `_calculatePricesAndDiscounts` - Calculates prices (first pass, before transaction creation)
  2. `_createDiscountUsageHistory` - Records usage history with transactionId (second pass, after transaction creation)
- Both methods now properly track which discounts were applied and their values
- Usage history records now include the `transactionId` for proper store filtering

### 2. Store Admin Discount History Returns Zero

**Problem**: Store admins couldn't see discount usage for their store, even when global discounts were used in their store.

**Root Cause**: The `getDiscountReport` query in `discount.service.ts` only filtered by `discount.storeId`, which excluded global discounts (where `storeId = null`).

**Solution**: Updated the filter logic to use OR condition:

```typescript
if (storeId) {
	where.OR = [
		{ discount: { storeId } }, // Store-specific discounts
		{ transaction: { storeId } }, // Global discounts used at this store
	];
}
```

This allows store admins to see:

- Discounts created specifically for their store
- Global discounts that were used in transactions at their store

## Changes Made

### Files Modified:

1. **src/services/transaction.service.ts**
   - Added `transactionId` and `storeId` parameters to `_calculatePricesAndDiscounts`
   - Created new `_createDiscountUsageHistory` method
   - Updated `createUserTransaction` to call both methods in sequence
   - Usage history now includes `transactionId` field

2. **src/services/discount.service.ts**
   - Updated `getDiscountReport` query filter
   - Changed from filtering by `discount.storeId` only
   - Now filters by `discount.storeId` OR `transaction.storeId`

3. **src/components/admin/discounts/DiscountHistory.tsx** (Frontend)
   - Fixed data parsing to handle nested response structure
   - Updated to show pagination info
   - Improved statistics display using backend summary data

## Testing

### Test Scenarios:

1. ✅ Create a store-specific discount
2. ✅ Create a global discount
3. ✅ Customer makes transaction using store-specific discount
4. ✅ Customer makes transaction using global discount
5. ✅ Store admin views discount history → Should see both types
6. ✅ Super admin views discount history → Should see all discounts
7. ✅ Discount usage counter increments correctly
8. ✅ Statistics display accurate totals

### Expected Results:

- **Discount Management page**: Usage counter updates after each transaction
- **Discount History page**: Shows all usage records with correct store filtering
- **Statistics**: Accurate totals for discount given, usage count, unique users

## Database Impact

### New Data Flow:

```
Transaction Created
  ↓
Discount Calculated & Applied to Products
  ↓
Transaction Saved with ID
  ↓
DiscountUsageHistory Created (with transactionId)
  ↓
Discount.currentUsageCount Incremented
```

### Schema Fields Used:

- `DiscountUsageHistory.transactionId` - Links usage to specific transaction
- `DiscountUsageHistory.discountValue` - Actual discount amount given
- `DiscountUsageHistory.orderTotal` - Order subtotal before discount
- `Transaction.storeId` - Enables filtering for store admins
- `Discount.currentUsageCount` - Tracks total usage count

## Backward Compatibility

**Note**: Transactions created before this fix will NOT have usage history records because they were never created. Only new transactions will be tracked properly.

To backfill historical data (optional):

- Would need a migration script to analyze past transactions
- Extract discount information from `TransactionProduct.discount` field
- Create corresponding `DiscountUsageHistory` records
- Update `currentUsageCount` on affected discounts

## Performance Considerations

- Added one extra database query sequence per transaction (minimal impact)
- The discount calculation logic is duplicated but necessary for transactionId dependency
- Consider caching discount rules if high transaction volume

## Future Improvements

1. Add discount analytics dashboard
2. Track discount effectiveness (conversion rates)
3. Add discount usage export functionality
4. Implement discount usage alerts/notifications
5. Create backfill script for historical data
