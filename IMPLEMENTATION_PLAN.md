# Implementation Plan: Easy Shopping BNPL Platform

## Focus: Payment & Reconciliation Flow

---

## Overview

This implementation plan focuses on building the **payment and reconciliation flow** for the Easy Shopping BNPL platform, with emphasis on OnePipe webhook integration. Since OnePipe needs to send payment notifications to our webhook, **backend development comes first**.

---

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend   │────────▶│  OnePipe    │
│   (React)   │         │  (Node.js)  │         │     API     │
└─────────────┘         └─────────────┘         └─────────────┘
                               │                        │
                               │                        │
                               ▼                        │
                        ┌─────────────┐                │
                        │  PostgreSQL │                │
                        │  Database   │                │
                        └─────────────┘                │
                               ▲                        │
                               │                        │
                               └────────────────────────┘
                                  Webhook Notifications
```

---

## Phase 1: Backend Infrastructure & Webhook Setup

**Priority: CRITICAL** (Required for OnePipe integration)

### Step 1.1: Initialize Backend Project

**Duration: 30 minutes**

```bash
# Create backend directory
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install express cors dotenv
npm install pg pg-hstore sequelize
npm install bcryptjs jsonwebtoken
npm install axios
npm install helmet express-rate-limit
npm install morgan

# Install dev dependencies
npm install --save-dev nodemon typescript @types/node @types/express
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

**Deliverables:**

- ✅ `package.json` with all dependencies
- ✅ `tsconfig.json` for TypeScript configuration
- ✅ `.env.example` file with required environment variables

---

### Step 1.2: Setup Database Schema

**Duration: 1 hour**

Create PostgreSQL database and tables as per PRD schema:

**Key Tables for Payment Flow:**

1. `users` - Authentication
2. `customers` - Customer profiles with BVN
3. `customer_accounts` - Linked bank accounts
4. `orders` - Order records
5. `mandates` - Payment mandates from OnePipe
6. `payment_attempts` - Webhook logs and payment tracking

**SQL Migration File:** `migrations/001_initial_schema.sql`

**Deliverables:**

- ✅ Database migration scripts
- ✅ Sequelize models for all tables
- ✅ Database connection configuration

---

### Step 1.3: Create Webhook Endpoint

**Duration: 2 hours**

**File:** `src/routes/webhooks.ts`

```javascript
POST / webhooks / onepipe;
```

**Webhook Handler Logic:**

1. Verify webhook signature (OnePipe security)
2. Parse payment notification payload
3. Identify mandate and order
4. Update payment status
5. Log attempt in `payment_attempts` table
6. Update order status if applicable
7. Trigger notifications (customer + vendor)

**Webhook Payload Structure (from OnePipe):**

```json
{
  "event_type": "payment.success",
  "mandate_id": "OPM_123456",
  "transaction_reference": "TXN_789012",
  "amount": 30000,
  "installment_number": 1,
  "payment_date": "2026-01-21T12:00:00Z",
  "status": "success"
}
```

**Deliverables:**

- ✅ Webhook endpoint implementation
- ✅ Signature verification middleware
- ✅ Payment status update logic
- ✅ Error handling and retry mechanism
- ✅ Webhook logging system

---

### Step 1.4: Deploy Backend with Public Webhook URL

**Duration: 1 hour**

**Deployment Options:**

- Railway.app (recommended)
- Render.com
- Heroku

**Steps:**

1. Create Railway project
2. Connect GitHub repository
3. Configure environment variables
4. Deploy backend
5. Get public webhook URL: `https://your-app.railway.app/webhooks/onepipe`
6. Configure URL in OnePipe dashboard

**Deliverables:**

- ✅ Backend deployed and accessible
- ✅ Webhook URL configured in OnePipe
- ✅ Health check endpoint: `GET /health`
- ✅ Webhook test endpoint for manual testing

---

## Phase 2: OnePipe API Integration

**Priority: HIGH**

### Step 2.1: OnePipe Service Module

**Duration: 2 hours**

**File:** `src/services/onepipe.service.ts`

**Implement OnePipe API Methods:**

#### 1. BVN Verification

```javascript
async lookupBvnMin(bvn: string, accountNumber: string, bankCode: string)
```

- Endpoint: `POST https://api.paywithaccount.com/v1/lookup_bvn_min`
- Purpose: Verify customer BVN matches account
- Returns: Account name, verification status

#### 2. Create Payment Mandate

```javascript
async sendInvoice(params: {
  customerId: string,
  amount: number,
  installments: number,
  accountNumber: string,
  bankCode: string
})
```

- Endpoint: `POST https://api.paywithaccount.com/v1/send_invoice`
- Purpose: Create recurring payment mandate
- Returns: Virtual account, mandate ID, payment instructions

#### 3. Query Mandate Status

```javascript
async getMandateStatus(mandateId: string)
```

- Endpoint: `GET https://api.paywithaccount.com/v1/mandate/{mandateId}`
- Purpose: Check current mandate status
- Returns: Mandate details, payment history

**Deliverables:**

- ✅ OnePipe service class
- ✅ API authentication handling
- ✅ Error handling for API failures
- ✅ Request/response logging
- ✅ Unit tests for each method

---

### Step 2.2: Account Linking Flow (Backend)

**Duration: 2 hours**

**Endpoints:**

```javascript
POST /api/customers/:id/accounts
PUT /api/customers/:id/accounts/:accountId
DELETE /api/customers/:id/accounts/:accountId
GET /api/customers/:id/accounts
```

**Account Addition Flow:**

1. Customer submits: BVN, Bank Code, Account Number
2. Backend calls `lookupBvnMin` to verify
3. If verified:
   - Store account in `customer_accounts` table
   - Mark as `verified = true`
   - Set priority (1 = primary if first account)
4. If failed:
   - Return error message
   - Log failed attempt

**Deliverables:**

- ✅ Account CRUD endpoints
- ✅ BVN verification integration
- ✅ Priority management logic
- ✅ Duplicate account prevention
- ✅ API tests

---

### Step 2.3: Order Creation & Mandate Initiation

**Duration: 3 hours**

**Endpoint:**

```javascript
POST / api / orders;
```

**Request Body:**

```json
{
  "customer_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1,
      "price": 120000
    }
  ],
  "installments": 4,
  "account_id": "uuid",
  "shipping_address": "..."
}
```

**Order Creation Flow:**

1. Validate customer has verified account
2. Calculate total amount and installment breakdown
3. Create order record (status: `pending`)
4. Call OnePipe `send_invoice` to create mandate
5. Store mandate details in `mandates` table
6. Update order with `current_mandate_id`
7. Return virtual account details to frontend

**Mandate Calculation:**

```javascript
Total: ₦120,000
Installments: 4
Amount per installment: ₦30,000
Start date: Today
Payment dates: Monthly (same day each month)
```

**Deliverables:**

- ✅ Order creation endpoint
- ✅ Mandate creation logic
- ✅ Payment schedule calculation
- ✅ Order validation rules
- ✅ Transaction handling (rollback on failure)

---

## Phase 3: Payment Reconciliation System

**Priority: HIGH**

### Step 3.1: Webhook Payment Processing

**Duration: 2 hours**

**Reconciliation Logic:**

```javascript
async processPaymentWebhook(webhookData) {
  // 1. Find mandate by OnePipe mandate ID
  const mandate = await Mandate.findOne({
    where: { onepipe_mandate_id: webhookData.mandate_id }
  });

  // 2. Log payment attempt
  await PaymentAttempt.create({
    mandate_id: mandate.id,
    installment_number: webhookData.installment_number,
    amount: webhookData.amount,
    status: webhookData.status,
    webhook_data: webhookData
  });

  // 3. If payment successful
  if (webhookData.status === 'success') {
    // Update mandate
    mandate.installments_paid += 1;
    await mandate.save();

    // Update order
    const order = await Order.findByPk(mandate.order_id);
    order.installments_paid += 1;
    order.amount_paid += webhookData.amount;

    // Check if order completed
    if (order.installments_paid === order.installments) {
      order.status = 'completed';
    } else {
      order.status = 'active';
    }
    await order.save();

    // Trigger notifications
    await notifyCustomer(order, 'payment_success');
    await notifyVendor(order, 'payment_received');
  }

  // 4. If payment failed
  if (webhookData.status === 'failed') {
    // Attempt backup account if available
    await attemptBackupAccount(mandate, order);
  }
}
```

**Deliverables:**

- ✅ Payment processing logic
- ✅ Order status updates
- ✅ Payment failure handling
- ✅ Idempotency (prevent duplicate processing)
- ✅ Webhook response (200 OK)

---

### Step 3.2: Backup Account Fallback

**Duration: 2 hours**

**Scenario:** Primary account payment fails

**Fallback Logic:**

1. Detect payment failure from webhook
2. Find customer's backup accounts (priority 2, 3)
3. Create new mandate with backup account
4. Call OnePipe `send_invoice` with new account
5. Update order's `current_mandate_id`
6. Mark old mandate as `replaced`
7. Notify customer of account switch

**Deliverables:**

- ✅ Backup account selection logic
- ✅ Mandate replacement flow
- ✅ Customer notification system
- ✅ Retry limits (max 3 accounts)

---

### Step 3.3: Reconciliation Dashboard (Admin)

**Duration: 2 hours**

**Endpoint:**

```javascript
GET / api / admin / reconciliation;
```

**Dashboard Data:**

- Total orders by status
- Payment success rate
- Failed payments (pending retry)
- Revenue breakdown (by vendor, by period)
- Webhook logs (last 100 events)

**Deliverables:**

- ✅ Reconciliation API endpoint
- ✅ Payment analytics queries
- ✅ Webhook log viewer
- ✅ Export to CSV functionality

---

## Phase 4: Frontend Development (Parallel with Backend)

**Priority: MEDIUM** (Can start after webhook is deployed)

### Step 4.1: Setup React Project

**Duration: 30 minutes**

```bash
npx create-react-app frontend --template typescript
cd frontend
npm install react-router-dom axios
npm install @tanstack/react-query
npm install tailwindcss postcss autoprefixer
npm install react-hook-form zod
npm install lucide-react
```

**Deliverables:**

- ✅ React app initialized
- ✅ TailwindCSS configured
- ✅ React Query setup
- ✅ Routing structure

---

### Step 4.2: Authentication Pages

**Duration: 2 hours**

**Pages:**

- `/login` - Customer/Vendor login
- `/register` - Customer registration
- `/register/vendor` - Vendor registration

**Features:**

- Form validation (React Hook Form + Zod)
- JWT token storage (localStorage)
- Protected routes
- Role-based redirects

**Deliverables:**

- ✅ Login/Register components
- ✅ Auth context provider
- ✅ Protected route wrapper
- ✅ API integration

---

### Step 4.3: Account Linking UI (Customer)

**Duration: 3 hours**

**Page:** `/dashboard/accounts`

**Components:**

1. **AccountList** - Display linked accounts
2. **AddAccountModal** - BVN verification form
3. **AccountCard** - Individual account display

**Add Account Flow:**

```
1. Click "Add Account" button
2. Modal opens with form:
   - BVN input (11 digits)
   - Bank dropdown (Nigerian banks)
   - Account number input (10 digits)
3. Submit → API call to verify BVN
4. If success:
   - Account added to list
   - Set as primary if first account
   - Show success message
5. If failed:
   - Show error message
   - Allow retry
```

**Deliverables:**

- ✅ Account management page
- ✅ Add account modal
- ✅ BVN verification integration
- ✅ Priority drag-and-drop
- ✅ Account deletion

---

### Step 4.4: Checkout & Payment Selection

**Duration: 3 hours**

**Page:** `/checkout`

**Components:**

1. **OrderSummary** - Cart items, total
2. **PaymentPlanSelector** - Installment options
3. **AccountSelector** - Choose payment account
4. **PaymentSchedule** - Preview payment dates

**Checkout Flow:**

```
1. Review cart items
2. Select payment plan:
   - Full payment
   - 2 months (₦60k × 2)
   - 3 months (₦40k × 3)
   - 4 months (₦30k × 4)
3. Select primary account (dropdown)
4. Review payment schedule
5. Click "Authorize Payment"
6. API creates order + mandate
7. Display virtual account details:
   - Account number
   - Bank name
   - Amount to transfer (first installment)
   - Transfer instructions
8. Customer completes transfer
9. Webhook updates order status
10. Redirect to order confirmation page
```

**Deliverables:**

- ✅ Checkout page
- ✅ Payment plan selector
- ✅ Account dropdown
- ✅ Payment schedule preview
- ✅ Virtual account display
- ✅ Order confirmation page

---

### Step 4.5: Order Tracking (Customer)

**Duration: 2 hours**

**Page:** `/dashboard/orders`

**Components:**

1. **OrderList** - All customer orders
2. **OrderDetail** - Individual order view
3. **PaymentTimeline** - Installment status

**Order Detail View:**

```
Order #12345
Status: Active (2/4 payments completed)

Products:
- Samsung TV - ₦120,000

Payment Schedule:
✅ Jan 21, 2026 - ₦30,000 (Paid)
✅ Feb 21, 2026 - ₦30,000 (Paid)
⏳ Mar 21, 2026 - ₦30,000 (Pending)
⏳ Apr 21, 2026 - ₦30,000 (Pending)

Payment Account: Access Bank - ...6789
```

**Deliverables:**

- ✅ Order list page
- ✅ Order detail page
- ✅ Payment timeline component
- ✅ Order status badges
- ✅ Download invoice button

---

## Phase 5: Vendor Features

**Priority: MEDIUM**

### Step 5.1: Product Upload

**Duration: 2 hours**

**Page:** `/vendor/products`

**Features:**

- Product form (name, price, description, category)
- Image upload (Cloudinary integration)
- Stock management
- Product list table

**Deliverables:**

- ✅ Product upload form
- ✅ Image upload integration
- ✅ Product CRUD operations
- ✅ Product list view

---

### Step 5.2: Order Management (Vendor)

**Duration: 2 hours**

**Page:** `/vendor/orders`

**Features:**

- View orders for vendor's products
- Filter by status (New, Paid, Shipped)
- Mark order as "Shipped"
- View payment status per order

**Deliverables:**

- ✅ Vendor order list
- ✅ Order status updates
- ✅ Shipping notification trigger

---

### Step 5.3: Earnings Dashboard

**Duration: 2 hours**

**Page:** `/vendor/earnings`

**Features:**

- Total earnings widget
- Payment breakdown (gross, fees, net)
- Transaction history
- Export to CSV

**Deliverables:**

- ✅ Earnings dashboard
- ✅ Revenue charts
- ✅ Settlement reports

---

## Phase 6: Testing & Deployment

**Priority: CRITICAL**

### Step 6.1: Webhook Testing

**Duration: 1 hour**

**Test Scenarios:**

1. ✅ Successful payment webhook
2. ✅ Failed payment webhook
3. ✅ Duplicate webhook (idempotency)
4. ✅ Invalid signature (security)
5. ✅ Malformed payload (error handling)

**Testing Tools:**

- Postman (manual webhook simulation)
- OnePipe test environment
- Webhook.site (payload inspection)

---

### Step 6.2: End-to-End Testing

**Duration: 2 hours**

**Test Cases:**

1. ✅ Customer registration
2. ✅ Account linking (BVN verification)
3. ✅ Product browsing
4. ✅ Checkout with installment
5. ✅ First payment (webhook processing)
6. ✅ Subsequent payments (auto-debit)
7. ✅ Payment failure + backup account
8. ✅ Order completion
9. ✅ Vendor order notification
10. ✅ Settlement calculation

---

### Step 6.3: Production Deployment

**Duration: 1 hour**

**Deployment Checklist:**

- ✅ Backend deployed to Railway
- ✅ Frontend deployed to Vercel
- ✅ Database hosted (Supabase/AWS RDS)
- ✅ Webhook URL configured in OnePipe
- ✅ Environment variables set
- ✅ SSL certificates active
- ✅ Monitoring setup (error tracking)

---

## Critical Path Summary

### Week 1 (Backend Focus)

**Day 1-2:**

- ✅ Backend setup
- ✅ Database schema
- ✅ Webhook endpoint
- ✅ Deploy + configure OnePipe

**Day 3-4:**

- ✅ OnePipe API integration
- ✅ Account linking endpoints
- ✅ Order creation logic

**Day 5:**

- ✅ Payment reconciliation
- ✅ Webhook testing

### Week 2 (Frontend + Integration)

**Day 1-2:**

- ✅ Frontend setup
- ✅ Authentication
- ✅ Account linking UI

**Day 3-4:**

- ✅ Checkout flow
- ✅ Order tracking
- ✅ Vendor features

**Day 5:**

- ✅ End-to-end testing
- ✅ Bug fixes

### Week 3 (Polish + Launch)

**Day 1-2:**

- ✅ UI polish
- ✅ UAT execution

**Day 3:**

- ✅ Production deployment
- ✅ Demo preparation

---

## Key Deliverables for Demo

1. **Webhook URL:** `https://your-app.railway.app/webhooks/onepipe`
2. **Test Accounts:**
   - 2 vendors with 5 products total
   - 3 customers with linked bank accounts
3. **Test Orders:**
   - 1 full payment order (completed)
   - 1 installment order (2/4 payments completed)
4. **Reconciliation Dashboard:**
   - Payment success rate: >95%
   - Webhook logs visible
   - Revenue breakdown by vendor

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# OnePipe API
ONEPIPE_API_KEY=your_api_key
ONEPIPE_API_SECRET=your_api_secret
ONEPIPE_BASE_URL=https://api.paywithaccount.com/v1
ONEPIPE_WEBHOOK_SECRET=your_webhook_secret

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=https://your-app.vercel.app

# File Upload
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Notifications (optional)
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

---

## Next Steps

1. **Review this plan** with your team
2. **Set up OnePipe test account** and get API credentials
3. **Create GitHub repository** for version control
4. **Start with Phase 1, Step 1.1** (Backend initialization)
5. **Deploy webhook endpoint ASAP** (required for OnePipe configuration)

---

## Questions to Resolve Before Starting

1. ✅ Do you have OnePipe API credentials?
2. ✅ Which database hosting service? (Supabase recommended)
3. ✅ Which deployment platform? (Railway recommended)
4. ✅ Do you need SMS/Email notifications? (Can skip for MVP)
5. ✅ Image hosting preference? (Cloudinary recommended)

---

**Ready to start building? Let's begin with Phase 1, Step 1.1!** 🚀
