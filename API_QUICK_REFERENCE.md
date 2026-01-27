# 🚀 Quick Reference: Easy Shopping API

## Base URL

```
Development: http://localhost:3000
Production: https://your-app.railway.app
```

## Authentication

All protected endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 📋 API Endpoints Quick Reference

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint                      | Auth | Description       |
| ------ | ----------------------------- | ---- | ----------------- |
| POST   | `/api/auth/register/customer` | ❌   | Register customer |
| POST   | `/api/auth/register/vendor`   | ❌   | Register vendor   |
| POST   | `/api/auth/login`             | ❌   | Login             |
| GET    | `/api/auth/me`                | ✅   | Get current user  |
| POST   | `/api/auth/logout`            | ✅   | Logout            |

### 👤 Customer Accounts (`/api/customers/:customerId/accounts`)

| Method | Endpoint                                         | Auth | Description              |
| ------ | ------------------------------------------------ | ---- | ------------------------ |
| GET    | `/api/customers/:customerId/accounts`            | ✅   | List accounts            |
| POST   | `/api/customers/:customerId/accounts`            | ✅   | Add account (BVN verify) |
| PUT    | `/api/customers/:customerId/accounts/:accountId` | ✅   | Update priority          |
| DELETE | `/api/customers/:customerId/accounts/:accountId` | ✅   | Remove account           |

### 📦 Orders (`/api/orders`)

| Method | Endpoint               | Auth        | Description                                                |
| ------ | ---------------------- | ----------- | ---------------------------------------------------------- |
| POST   | `/api/orders`          | ✅ Customer | Create order (frequency: daily/weekly/monthly, count: 1-3) |
| GET    | `/api/orders`          | ✅ Customer | List customer orders                                       |
| GET    | `/api/orders/:orderId` | ✅ Customer | Get order details                                          |

### 🛍️ Products (`/api/products`)

| Method | Endpoint                   | Auth      | Description                               |
| ------ | -------------------------- | --------- | ----------------------------------------- |
| GET    | `/api/products`            | ❌        | List products (public)                    |
| GET    | `/api/products/:productId` | ❌        | Get product                               |
| POST   | `/api/products`            | ✅ Vendor | Create product (no admin approval needed) |
| PUT    | `/api/products/:productId` | ✅ Vendor | Update product                            |
| DELETE | `/api/products/:productId` | ✅ Vendor | Delete product                            |

### 🪝 Webhooks (`/webhooks`)

| Method | Endpoint            | Auth              | Description     |
| ------ | ------------------- | ----------------- | --------------- |
| POST   | `/webhooks/onepipe` | OnePipe Signature | Payment webhook |
| GET    | `/webhooks/health`  | ❌                | Webhook health  |

---

## 🔑 Common Request Examples

### Register Customer

```bash
curl -X POST http://localhost:3000/api/auth/register/customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+2348012345678",
    "bvn": "12345678901"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "SecurePass123!"
  }'
```

### Add Bank Account

```bash
curl -X POST http://localhost:3000/api/customers/{customerId}/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "accountNumber": "0123456789",
    "bankCode": "044",
    "bankName": "Access Bank"
  }'
```

### Create Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "items": [{"productId": "uuid", "quantity": 1}],
    "installments": 4,
    "accountId": "uuid",
    "shippingAddress": "123 Main St, Lagos"
  }'
```

---

## 🧪 Testing

### Quick Test

```bash
cd backend
node test-api.js
```

### Start Server

```bash
cd backend
npm run dev
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## 📊 Response Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request (validation error)       |
| 401  | Unauthorized (invalid/missing token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found                            |
| 500  | Internal Server Error                |

---

## 🔄 Complete User Flow

```
1. Register → POST /api/auth/register/customer
   ↓
2. Login → POST /api/auth/login (get token)
   ↓
3. Add Account → POST /api/customers/:id/accounts (BVN verify)
   ↓
4. Browse Products → GET /api/products
   ↓
5. Create Order → POST /api/orders (creates mandate)
   ↓
6. Transfer Payment → Customer pays to virtual account
   ↓
7. Webhook → POST /webhooks/onepipe (OnePipe notifies)
   ↓
8. Track Order → GET /api/orders/:id
```

---

## 🛠️ Development

### Environment Variables

```bash
# Required
ONEPIPE_API_KEY=your_key
ONEPIPE_CLIENT_SECRET=your_secret
ONEPIPE_WEBHOOK_SECRET=your_webhook_secret
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret

# Optional
ONEPIPE_MOCK_MODE=true  # For testing without OnePipe
```

### Database Setup

```bash
createdb easy_shopping
psql -d easy_shopping -f backend/database/schema.sql
```

---

## 📚 Documentation

- [Phase 2 Complete](../PHASE_2_COMPLETE.md) - Full API documentation
- [Backend Setup](backend/README.md) - Setup guide
- [Architecture](../ARCHITECTURE.md) - System architecture
- [OnePipe Docs](https://docs.paywithaccount.com/) - OnePipe API

---

**Last Updated:** 2026-01-22
