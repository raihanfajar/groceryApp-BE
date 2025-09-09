#!/bin/bash

# Login Test Script
BASE_URL="http://localhost:8000"

echo "🔐 Testing Admin Login..."
echo "=========================="

# Test 1: Admin Login
echo "1. Testing login with superadmin credentials:"
curl -X POST "$BASE_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@groceryapp.com", 
    "password": "superadmin123"
  }' \
  -v

echo -e "\n\n"

# Test 2: Test with store admin
echo "2. Testing login with store admin credentials:"
curl -X POST "$BASE_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jakarta@groceryapp.com", 
    "password": "storeadmin123"
  }' \
  -v

echo -e "\n\n"

# Test 3: Test protected endpoint without token
echo "3. Testing protected endpoint without token (should fail):"
curl -X GET "$BASE_URL/admin/profile" \
  -H "Content-Type: application/json" \
  -v

echo -e "\n\n"

echo "📝 Instructions:"
echo "1. Make sure the server is running: npm run dev"
echo "2. If login works, copy the token from the response"
echo "3. Test protected endpoints with: curl -H 'Authorization: Bearer YOUR_TOKEN' ..."
