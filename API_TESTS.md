# Admin Account Management API Tests

## Authentication Endpoints

### 1. Super Admin Login
```bash
POST http://localhost:8000/admin/login
Content-Type: application/json

{
  "email": "superadmin@groceryapp.com",
  "password": "superadmin123"
}
```

### 2. Store Admin Login (Jakarta)
```bash
POST http://localhost:8000/admin/login
Content-Type: application/json

{
  "email": "jakarta@groceryapp.com",
  "password": "storeadmin123"
}
```

### 3. Store Admin Login (Bandung)
```bash
POST http://localhost:8000/admin/login
Content-Type: application/json

{
  "email": "bandung@groceryapp.com",
  "password": "storeadmin456"
}
```

## Protected Endpoints (Require Admin Token)

**Note**: Add the token from login response to Authorization header as "Bearer {token}"

### 4. Get Admin Profile
```bash
GET http://localhost:8000/admin/profile
Authorization: Bearer {your_admin_token}
```

## Super Admin Only Endpoints

### 5. Get All Users
```bash
GET http://localhost:8000/admin/users
Authorization: Bearer {super_admin_token}
```

### 6. Get All Store Admins
```bash
GET http://localhost:8000/admin/store-admins
Authorization: Bearer {super_admin_token}
```

### 7. Create New Store Admin
```bash
POST http://localhost:8000/admin/store-admins
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "name": "New Store Manager",
  "email": "newstore@groceryapp.com",
  "password": "newpassword123",
  "storeId": "{store_id_optional}"
}
```

### 8. Update Store Admin
```bash
PUT http://localhost:8000/admin/store-admins/{admin_id}
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "name": "Updated Store Manager",
  "email": "updated@groceryapp.com",
  "storeId": "{new_store_id_optional}"
}
```

### 9. Delete Store Admin
```bash
DELETE http://localhost:8000/admin/store-admins/{admin_id}
Authorization: Bearer {super_admin_token}
```

## Test Cases

### Success Cases:
1. ✅ Super admin can login successfully
2. ✅ Store admin can login successfully  
3. ✅ Admin can access their profile
4. ✅ Super admin can view all users
5. ✅ Super admin can view all store admins
6. ✅ Super admin can create new store admin
7. ✅ Super admin can update store admin details
8. ✅ Super admin can delete store admin

### Error Cases:
1. ❌ Invalid credentials return 401
2. ❌ Missing token returns 401
3. ❌ Invalid token returns 401
4. ❌ Store admin trying to access super admin endpoints returns 403
5. ❌ Non-admin user trying to access admin endpoints returns 403
6. ❌ Creating admin with existing email returns 409
7. ❌ Updating non-existent admin returns 404
8. ❌ Trying to modify super admin returns 403

## Health Check
```bash
GET http://localhost:8000/
```
