# Frontend Implementation Guide: BVN-Less Account Storage

## Overview

We have transitioned to a **BVN-less storage model**. We no longer store the customer's BVN in our database. Instead, BVN is collected ONLY during the **Add Bank Account** step for real-time verification and then discarded.

---

## 1. Updates to Signup Flow

**Goal**: Remove BVN collection from the registration form.

### Changes

- **Remove Input Field**: Delete the "BVN" input field from the signup form.
- **Update API Call**: The `POST /api/auth/register/customer` endpoint no longer accepts `bvn`.

**New Payload:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "08012345678"
}
```

---

## 2. Updates to Add Bank Account Flow

**Goal**: Add BVN input field here for improved security and account verification.

### UI Changes

- **Add Input Field**: Add a new text input for **BVN (11 digits)**.
- **Add Warning Label**: Display a notice:
  > "⚠️ We use your BVN to verify account ownership. We DO NOT store your BVN."

### API Integration

- **Endpoint**: `POST /api/customers/:customerId/accounts`
- **New Payload**:
  ```json
  {
    "accountNumber": "0123456789",
    "bankCode": "044", // Access Bank
    "bankName": "Access Bank",
    "bvn": "22233344455" // <--- NEW FIELD (Required)
  }
  ```

### Handling Responses

- **Success (201 Created)**: Account verified and linked.
  ```json
  {
    "message": "Account added successfully",
    "account": { ... }
  }
  ```
- **Error (400 Bad Request)**:
  - `"BVN doesn't match this account. Please check your details."` → Show error on BVN field.
  - `"Account already linked to your profile"` → Show error on Account Number field.

---

## 3. Updates to Bank Account List

**Goal**: Display masked account numbers for security.

### API Response

The `GET /api/customers/:customerId/accounts` endpoint now returns `accountNumberMasked`.

### UI Changes

- **Display Logic**: Use `accountNumberMasked` (e.g., `****6789`) instead of the full account number in the list view.
- **Full Number**: The full `accountNumber` is typically not returned in the list view anymore to enforce security (check API response if needed for specific use cases).

**Sample Response Object:**

```json
{
  "id": "...",
  "accountNumberMasked": "****6789",
  "bankName": "Access Bank",
  "verified": true
}
```
