# OnePipe Integration Documentation

This document outlines the API integration details for the frontend team to interact with the backend OnePipe services.

## Overview

The backend exposes endpoints that wrap the OnePipe API to handle authentication, signature generation, and encryption securely. The frontend SHOULD NOT call OnePipe directly.

## Endpoints

### 1. Get List of Banks

Retrieves a list of banks supported by OnePipe Pay with Account.

- **Backend Method**: `OnePipeService.getBanks(params)`
- **OnePipe Request Type**: `get_banks`

**Usage**:
Use this to populate a bank selection dropdown for the user.

**Payload Structure (handled by backend)**:

```json
{
  "request_ref": "{{auto_generated}}",
  "request_type": "get_banks",
  "auth": {
    "type": null,
    "secure": null,
    "auth_provider": "PaywithAccount",
    "route_mode": null
  },
  "transaction": {
    "mock_mode": "inspect", // or "live" based on env
    "transaction_ref": "{{auto_generated}}",
    "customer": {
      // Customer details if available
    },
    "meta": {
      "pwa_enabled_only": true
    },
    "details": null
  }
}
```

### 2. Lookup Account

Verifies a bank account number against a selected bank.

- **Backend Method**: `OnePipeService.lookupAccount(params)`
- **OnePipe Request Type**: `lookup_account_min`

**Parameters**:

- `accountNumber`: The user's 10-digit NUBAN account number.
- `bankCode`: The code of the bank selected from the `getBanks` list.
- `customerName`: Full name of the customer.
- `customerEmail`: Email of the customer.
- `customerMobile`: (Optional) Phone number.

**Usage**:
Call this when the user enters their account number to verify the name matches before proceeding to payment.

**Payload Structure (handled by backend)**:

```json
{
  "request_ref": "{{auto_generated}}",
  "request_type": "lookup_account_min",
  "auth": {
    "type": "bank.account",
    "secure": "{{encrypted_triple_des_account_details}}",
    "auth_provider": "PaywithAccount",
    "route_mode": null
  },
  "transaction": {
    "mock_mode": "inspect", // or "live"
    "transaction_ref": "{{auto_generated}}",
    "amount": 0,
    "customer": {
      "firstname": "...",
      "surname": "...",
      "email": "...",
      "mobile_no": "..."
    },
    "meta": {},
    "details": {}
  }
}
```

### 3. Send Invoice (Payment Request)

Initiates a payment request (mandate) to the user's account.

- **Backend Method**: `OnePipeService.sendInvoice(params)`
- **OnePipe Request Type**: `send invoice`

**Parameters**:

- `amount`: Amount to charge.
- `customerId`: Unique ID of the customer.
- `paymentType`: `single_payment` or `recurring`.
- `accountNumber`: (Required for recurring) The verified account number.
- `bankCode`: (Required for recurring) The bank code.

**Payload Structure (handled by backend)**:

- **Single Payment**: Uses `auth.type: "bank.account"` and `auth_provider: "paywithaccount"`.
- **Recurring**: Uses `auth.type: "bank.account"` with encrypted secure field.

## Notes for Frontend

1.  **Do not handle encryption**: Pass raw account numbers and bank codes to the backend. The backend handles TripleDES encryption and hashing.
2.  **Environment**: The API URLs and Keys are managed via backend environment variables (`ONEPIPE_API_URL`, `ONEPIPE_API_KEY`, etc.).
3.  **Error Handling**: The backend wraps OnePipe errors. Display the `message` field from the error response to the user.
