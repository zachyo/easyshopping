# Easy Shopping API Integration Guide

This document provides a complete reference for integrating with the Easy Shopping API. It is designed to be used by frontend developers or AI coding assistants (like Lovable) to generate the necessary API client code.

## 🌐 Base Configuration

### Base URLs

- **Development**: `http://localhost:3000`
- **Production**: `https://easyshopping-production.up.railway.app/`

### Authentication

All protected endpoints expect a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### 1. Register Customer

Create a new customer account.

- **Endpoint**: `POST /api/auth/register/customer`
- **Public**: Yes
- **Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+2348012345678",
    "bvn": "12345678901"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "Customer registered successfully",
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "role": "customer"
    }
  }
  ```

### 2. Register Vendor

Create a new vendor account.

- **Endpoint**: `POST /api/auth/register/vendor`
- **Public**: Yes
- **Body**:
  ```json
  {
    "email": "vendor@example.com",
    "password": "SecurePassword123!",
    "businessName": "My Shop",
    "businessCategory": "Electronics",
    "settlementAccountNumber": "0123456789",
    "settlementBankCode": "044"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "Vendor registered successfully. Awaiting admin approval.",
    "token": "jwt_token_here",
    "user": { "id": "uuid", "role": "vendor" }
  }
  ```

### 3. Login

Authenticate a user.

- **Endpoint**: `POST /api/auth/login`
- **Public**: Yes
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200)**:
  ```json
  {
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "customer" // or "vendor"
    }
  }
  ```

### 4. Get Current User

Get details of the currently logged-in user.

- **Endpoint**: `GET /api/auth/me`
- **Auth**: Required
- **Response (200)**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "role": "customer",
    "isVerified": true
  }
  ```

---

## 🛍️ Product Endpoints

### 1. List Products

Get a paginated list of products.

- **Endpoint**: `GET /api/products`
- **Public**: Yes
- **Query Params**:
  - `category`: Filter by category (optional)
  - `minPrice`: Minimum price (optional)
  - `maxPrice`: Maximum price (optional)
  - `search`: Search term for name/description (optional)
  - `limit`: Items per page (default 20)
  - `offset`: Pagination offset (default 0)
- **Response (200)**:
  ```json
  {
    "products": [
      {
        "id": "uuid",
        "name": "iPhone 13",
        "description": "Latest model",
        "price": 450000,
        "category": "Electronics",
        "stockQuantity": 10,
        "images": ["url1", "url2"],
        "status": "active"
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0
    }
  }
  ```

### 2. Get Product Details

Get a single product by ID.

- **Endpoint**: `GET /api/products/:productId`
- **Public**: Yes
- **Response (200)**:
  ```json
  {
    "product": {
      "id": "uuid",
      "name": "iPhone 13",
      "description": "Latest model",
      "price": 450000,
      "category": "Electronics",
      "stockQuantity": 10,
      "images": ["url1", "url2"],
      "status": "active",
      "createdAt": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 3. Create Product (Vendor Only)

- **Endpoint**: `POST /api/products`
- **Auth**: Required (Vendor)
- **Body**:
  ```json
  {
    "name": "Product Name",
    "description": "Description",
    "price": 1000,
    "category": "Category",
    "stockQuantity": 50,
    "images": ["url1"]
  }
  ```

---

## 👤 Customer Account Endpoints

### 1. List Accounts

Get linked bank accounts for the logged-in customer.

- **Endpoint**: `GET /api/customers/:customerId/accounts`
- **Auth**: Required
- **Response (200)**:
  ```json
  {
    "accounts": [
      {
        "id": "uuid",
        "accountNumber": "0123456789",
        "bankCode": "044",
        "bankName": "Access Bank",
        "accountName": "John Doe",
        "priority": 1,
        "verified": true
      }
    ]
  }
  ```

### 2. Add Bank Account

Link a new bank account. This triggers a BVN verification check.

- **Endpoint**: `POST /api/customers/:customerId/accounts`
- **Auth**: Required
- **Body**:
  ```json
  {
    "accountNumber": "0123456789",
    "bankCode": "044",
    "bankName": "Access Bank"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "Account added successfully",
    "account": {
      "id": "uuid",
      "accountNumber": "0123456789",
      "verified": true
    }
  }
  ```

---

## 📦 Order Endpoints

### 1. Create Order

Create a new order. If `installments > 1`, this initiates a OnePipe payment mandate.

- **Endpoint**: `POST /api/orders`
- **Auth**: Required (Customer)
- **Body**:
  ```json
  {
    "items": [{ "productId": "uuid", "quantity": 1 }],
    "installments": 4,
    "accountId": "uuid_of_linked_account",
    "shippingAddress": "123 Main St, Lagos"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "Order created successfully",
    "order": {
      "id": "uuid",
      "totalAmount": 450000,
      "installments": 4,
      "amountPerInstallment": 112500,
      "status": "authorized"
    },
    "mandate": {
      "virtualAccount": "1234567890",
      "amountPerInstallment": 112500,
      "startDate": "2023-01-01",
      "endDate": "2023-05-01"
    },
    "paymentInstructions": {
      "message": "Transfer the first installment to the virtual account below",
      "virtualAccount": "1234567890",
      "amount": 112500,
      "bankName": "Access Bank"
    }
  }
  ```

### 2. List Orders

Get all orders for the logged-in customer.

- **Endpoint**: `GET /api/orders`
- **Auth**: Required
- **Response (200)**:
  ```json
  {
    "orders": [
      {
        "id": "uuid",
        "totalAmount": 450000,
        "status": "authorized",
        "items": [...]
      }
    ]
  }
  ```

### 3. Get Order Details

- **Endpoint**: `GET /api/orders/:orderId`
- **Auth**: Required
- **Response (200)**: Returns full order details including mandate info if applicable.

---

## ⚠️ Error Handling

The API returns standard HTTP status codes:

- `200/201`: Success
- `400`: Bad Request (Validation failed)
- `401`: Unauthorized (Invalid/Missing Token)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

**Error Response Format**:

```json
{
  "error": "Description of the error"
}
```
