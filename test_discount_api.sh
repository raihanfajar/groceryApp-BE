#!/bin/bash

# Discount Management API Test Script
# Make sure the server is running with: npm run dev

BASE_URL="http://localhost:8000"
ADMIN_EMAIL="superadmin@groceryapp.com"
ADMIN_PASSWORD="superadmin123"

echo "🔧 Testing Discount Management API..."
echo "======================================"

# Step 1: Admin Login
echo "1. Testing admin login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token (you'll need to manually extract this)
# TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo ""
echo "📝 To continue testing, extract the token from above and run:"
echo ""
echo "TOKEN=\"YOUR_TOKEN_HERE\""
echo ""

# Step 2: Test Create Discount
echo "2. Example: Create a percentage discount"
echo "curl -X POST \"$BASE_URL/discounts\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{"
echo "    \"name\": \"Weekend Special\","
echo "    \"description\": \"20% off on fresh fruits\","
echo "    \"type\": \"AUTOMATIC\","
echo "    \"valueType\": \"PERCENTAGE\","
echo "    \"value\": 20,"
echo "    \"maxDiscountAmount\": 50000,"
echo "    \"minTransactionValue\": 100000,"
echo "    \"startDate\": \"2025-09-10T00:00:00.000Z\","
echo "    \"endDate\": \"2025-09-12T23:59:59.000Z\","
echo "    \"productIds\": [\"PRODUCT_UUID_HERE\"]"
echo "  }'"
echo ""

# Step 3: Test Get Discounts
echo "3. Example: Get all discounts"
echo "curl -X GET \"$BASE_URL/discounts\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\""
echo ""

# Step 4: Test BOGO Discount
echo "4. Example: Create BOGO discount"
echo "curl -X POST \"$BASE_URL/discounts\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{"
echo "    \"name\": \"Buy 2 Get 1 Free\","
echo "    \"description\": \"Get 1 free for every 2 bananas\","
echo "    \"type\": \"BOGO\","
echo "    \"valueType\": \"PERCENTAGE\","
echo "    \"value\": 100,"
echo "    \"startDate\": \"2025-09-10T00:00:00.000Z\","
echo "    \"endDate\": \"2025-09-12T23:59:59.000Z\","
echo "    \"productIds\": [\"BANANA_PRODUCT_UUID\"],"
echo "    \"buyQuantity\": 2,"
echo "    \"getQuantity\": 1,"
echo "    \"applyToSameProduct\": true"
echo "  }'"
echo ""

# Step 5: Test Available Discounts
echo "5. Example: Get available discounts for customers"
echo "curl -X GET \"$BASE_URL/discounts/available/public?storeId=STORE_UUID&orderTotal=150000&productIds=PRODUCT_UUID1,PRODUCT_UUID2\""
echo ""

echo "🎉 Test script ready!"
echo "Start the server with: npm run dev"
echo "Then run this script: chmod +x test_discount_api.sh && ./test_discount_api.sh"
