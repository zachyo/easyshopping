# PRD: Easy Shopping E-Commerce Platform

---

# Product Requirements Document

**Product:** Easy Shopping - BNPL E-Commerce Platform  
**Version:** 1.0  
**Date:** January 2026  
**Target Launch:** Phase 3 (Jan 19-30, 2026)

---

## 1. Product Overview

### 1.1 Vision

Enable Nigerian merchants to offer installment payments without technical complexity, while giving customers affordable access to high-value products.
Payment infrastructure provided by OnePipe.
Docs here : https://docs.paywithaccount.com/

### 1.2 Target Users

- **Vendors/Merchants:** Small to medium online retailers (electronics, furniture, fashion)
- **Customers:** Banked Nigerians aged 18-35, earning ₦80k-₦300k/month

### 1.3 Core Value Proposition

- **For Merchants:** Increase sales by 30%, reduce cart abandonment by 25%
- **For Customers:** Buy ₦120k products with ₦30k monthly payments

---

## 2. User Roles & Permissions

| Role         | Access                                       | Capabilities                                                      |
| ------------ | -------------------------------------------- | ----------------------------------------------------------------- |
| **Customer** | Public-facing storefront + account dashboard | Browse products, checkout, manage payment accounts, track orders  |
| **Vendor**   | Vendor dashboard                             | Upload products, manage inventory, view sales, track settlements  |
| **Admin**    | Admin panel                                  | Manage vendors, view all orders, configure platform fees, support |

---

## 3. Core Features

### 3.1 Customer-Facing Features

#### **Feature 1: Product Browsing**

- **Description:** Customers browse vendor-uploaded products
- **Requirements:**
  - Product catalog with filtering (category, price range)
  - Product detail page (images, description, price, vendor info)
  - Search functionality (by name, category)
  - Sort by: Price (low-high), Newest, Popular
- **UI Components:**
  - Product grid/list view
  - Product card: Image, title, price, "View Details" button
  - Filter sidebar (mobile: bottom sheet)

---

#### **Feature 2: Shopping Cart**

- **Description:** Add multiple products before checkout
- **Requirements:**
  - Add/remove products
  - Update quantity
  - Display subtotal
  - Persist cart across sessions (localStorage or user account)
- **UI Components:**
  - Cart icon with badge (item count)
  - Cart page with line items
  - "Proceed to Checkout" button

---

#### **Feature 3: Installment Checkout**

- **Description:** Choose payment plan at checkout
- **Requirements:**
  - Display payment options:
    - Full payment (default)
    - 2-month installment
    - 3-month installment
    - 4-month installment
  - Show breakdown:

```
    Total: ₦120,000
    4-month plan: ₦30,000 × 4 payments
    Next payment dates: Feb 6, Mar 6, Apr 6

Select primary account from linked accounts
Create mandate via OnePipe send_invoice
UI Components:

Payment plan selector (radio buttons or cards)
Account dropdown (if customer has multiple accounts)
Payment schedule preview
"Authorize Payment" button


Edge Cases:

Customer has no linked accounts → redirect to "Add Account" first
Checkout timeout (24 hours) → expire order




Feature 4: Account Management

Description: Link and manage multiple bank accounts
Requirements:

Add account form:

BVN input (encrypted)
Bank selection (dropdown)
Account number input
Account name (auto-filled after validation)


BVN verification via OnePipe lookup_bvn_min
Set account priority (drag-to-reorder or dropdown)
View all linked accounts (table: Bank, Account, Priority, Status)
Remove account (only if not used in active order)


UI Components:

"Add Account" button → modal form
Account list table
Priority badges (Primary, Backup 1, Backup 2)
Verification status icons (✓ Verified, ⏳ Pending)


Validations:

BVN must be 11 digits
Account number: 10 digits (NUBAN)
Duplicate prevention (same account can't be added twice)




Feature 5: Order Tracking

Description: View current and past orders
Requirements:

Order list:

Order ID, Date, Total, Status
Filter by status (Active, Completed, Failed)


Order detail page:

Product info
Payment schedule with status per installment (✓ Paid, ⏳ Pending, ❌ Failed)
Current mandate details (which account is being used)
Download invoice/receipt




UI Components:

Order cards/table
Status badges (color-coded)
Payment timeline component
"View Details" link per order




Feature 6: Profile Management

Description: Update personal information
Requirements:

Edit: Name, Email, Phone
Change password
View total monthly commitment (sum of all active installments)


UI Components:

Profile form
Password change section
Monthly commitment widget (dashboard card)




3.2 Vendor-Facing Features
Feature 7: Vendor Registration

Description: Onboard new merchants
Requirements:

Registration form:

Business name
Contact email/phone
Business category (Electronics, Fashion, etc.)
Bank details (settlement account)


Admin approval workflow (manual review)


UI Components:

Multi-step registration form
Status page (Pending Approval → Approved → Active)




Feature 8: Product Upload

Description: Add products to catalog
Requirements:

Product form fields:

Name (required, max 100 chars)
Description (rich text, max 500 words)
Price (required, min ₦5,000 for installment eligibility)
Category (dropdown)
Stock quantity
Images (upload up to 5 images, 2MB each)


Bulk upload via CSV (optional, Phase 2 feature)
Edit/delete products
Inventory management (update stock)


UI Components:

"Add Product" button → form modal
Product management table (Name, Price, Stock, Status, Actions)
Image uploader (drag-drop or file picker)
WYSIWYG editor for description




Feature 9: Order Management (Vendor)

Description: Track sales and fulfillment
Requirements:

View orders assigned to vendor
Filter by status (New, Paid, Shipped, Completed)
Mark order as "Shipped" (triggers customer notification)
View payment status per order (which installments paid)


UI Components:

Order dashboard with metrics (Total Sales, Pending Orders)
Order list table
"Mark as Shipped" button
Order detail modal




Feature 10: Settlement Dashboard

Description: Track payouts
Requirements:

View total earnings
See payment breakdown:

Gross sales
Platform fees (our 2%)
Net payout


Download settlement reports (PDF/CSV)
Settlement schedule: Weekly or monthly (configurable by admin)


UI Components:

Earnings widget (total, this week, this month)
Transaction history table
Export buttons




3.3 Admin Features
Feature 11: Vendor Approval

Description: Review and approve merchant applications
Requirements:

View pending vendors
Approve/Reject with reason
View vendor details (business docs, contact info)


UI Components:

Pending vendors queue
Vendor detail modal
Approve/Reject buttons




Feature 12: Platform Configuration

Description: Set system-wide settings
Requirements:

Configure platform fee (default 2%)
Set installment options (enable/disable 2, 3, 4 month plans)
Manage categories (add/edit/delete)
View system metrics (GMV, total orders, active customers)


UI Components:

Settings page with tabs (Fees, Installments, Categories)
Metrics dashboard (charts for GMV over time)




Feature 13: Support & Monitoring

Description: Handle customer/vendor issues
Requirements:

View all orders (search by order ID, customer email)
See payment history (webhook logs)
Manual actions:

Retry failed payment
Cancel order
Issue refund (future feature)




UI Components:

Global search bar
Order detail with action buttons
Webhook logs table (timestamp, event, status)




4. Technical Requirements
4.1 Frontend (React)
Pages:

Public Pages:

Home (featured products, categories)
Product Listing (with filters)
Product Detail
Cart
Checkout
Login/Register


Customer Dashboard:

Orders
Payment Accounts
Profile


Vendor Dashboard:

Products
Orders
Earnings
Settings


Admin Dashboard:

Vendors
Orders
Analytics
Settings



State Management:

Context API or Redux (for cart, auth state)
React Query (for API data fetching)

Key Libraries:

React Router (navigation)
Axios (API calls)
TailwindCSS (styling)
React Hook Form (forms)
Recharts (analytics charts)


4.2 Backend (Node.js/Express or Python/FastAPI)
API Endpoints:
Auth:

POST /api/auth/register (customer/vendor signup)
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me (get current user)

Customers:

GET /api/customers/{id}/accounts (list linked accounts)
POST /api/customers/{id}/accounts (add account, trigger BVN verification)
PUT /api/customers/{id}/accounts/{account_id} (update priority)
DELETE /api/customers/{id}/accounts/{account_id}

Products:

GET /api/products (list with filters, pagination)
GET /api/products/{id}
POST /api/products (vendor creates product)
PUT /api/products/{id}
DELETE /api/products/{id}

Orders:

POST /api/orders (create order, initiate mandate)
GET /api/orders/{id}
GET /api/customers/{id}/orders
GET /api/vendors/{id}/orders
PUT /api/orders/{id}/ship (vendor marks as shipped)

Webhooks:

POST /webhooks/onepipe (receive payment notifications)

Admin:

GET /api/admin/vendors (pending approvals)
PUT /api/admin/vendors/{id}/approve
GET /api/admin/metrics


4.3 Database Schema (PostgreSQL)
sql-- Users (all roles)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(20), -- 'customer' | 'vendor' | 'admin'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer profiles
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  bvn VARCHAR(11),  -- Encrypted
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vendor profiles
CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  business_name VARCHAR(200),
  business_category VARCHAR(100),
  settlement_account_number VARCHAR(20),
  settlement_bank_code VARCHAR(10),
  approval_status VARCHAR(50), -- 'pending' | 'approved' | 'rejected'
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer accounts (bank accounts)
CREATE TABLE customer_accounts (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  account_number VARCHAR(20),
  bank_code VARCHAR(10),
  bank_name VARCHAR(100),
  account_name VARCHAR(200),
  priority INT,  -- 1=primary, 2=backup1, 3=backup2
  verified BOOLEAN DEFAULT FALSE,
  bvn_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, account_number)
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  name VARCHAR(200),
  description TEXT,
  price DECIMAL(10,2),
  category VARCHAR(100),
  stock_quantity INT DEFAULT 0,
  images JSONB,  -- Array of image URLs
  status VARCHAR(50) DEFAULT 'active', -- 'active' | 'out_of_stock' | 'archived'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  vendor_id UUID REFERENCES vendors(id),
  total_amount DECIMAL(10,2),
  installments INT,  -- NULL for full payment, 2/3/4 for installments
  amount_per_installment DECIMAL(10,2),
  installments_paid INT DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50), -- 'pending' | 'authorized' | 'active' | 'shipped' | 'completed' | 'failed'
  current_mandate_id UUID REFERENCES mandates(id),
  order_items JSONB,  -- Array of {product_id, name, price, quantity}
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mandates
CREATE TABLE mandates (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  customer_account_id UUID REFERENCES customer_accounts(id),
  onepipe_mandate_id VARCHAR(255) UNIQUE,
  virtual_account VARCHAR(20),
  amount_per_installment DECIMAL(10,2),
  total_installments INT,
  installments_paid INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50), -- 'pending_auth' | 'active' | 'completed' | 'failed' | 'replaced'
  replaced_by_mandate_id UUID REFERENCES mandates(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment attempts (webhook logs)
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY,
  mandate_id UUID REFERENCES mandates(id),
  installment_number INT,
  amount DECIMAL(10,2),
  status VARCHAR(50), -- 'attempted' | 'success' | 'failed'
  failure_reason TEXT,
  webhook_data JSONB,
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Platform settings
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Example: ('platform_fee_percentage', '2.0'), ('installment_options', '[2,3,4]')
```

---

### 4.4 File Storage (Images)

**Options:**

- **AWS S3** (production)
- **Cloudinary** (easier setup, free tier)
- **Supabase Storage** (if using Supabase for DB)

**Upload Flow:**

1. Vendor uploads product image
2. Frontend sends to backend
3. Backend uploads to S3/Cloudinary, gets URL
4. Store URL in `products.images` JSONB field

---

## 5. User Flows

### 5.1 Customer Purchase Flow

```
1. Browse products → Add to cart
2. Checkout → Select "4-month installment"
3. System checks: Does customer have linked accounts?
   - No → Redirect to "Add Account" page
   - Yes → Show account dropdown (select primary)
4. Review order summary (payment schedule)
5. Click "Authorize Payment"
6. Backend calls OnePipe send_invoice
7. Display virtual account + transfer instructions
8. Customer transfers first installment (₦30k)
9. OnePipe sends webhook → Update order status
10. Vendor receives notification → Ships product
11. Customer receives tracking info
12. Auto-debits for installments 2, 3, 4
13. Order marked "completed" after final payment
```

---

### 5.2 Vendor Product Upload Flow

```
1. Login to vendor dashboard
2. Click "Add Product"
3. Fill form (name, price, description, category)
4. Upload 3 images (drag-drop or browse)
5. Set stock quantity
6. Submit → Product saved to DB
7. Product appears in public catalog (if approved by admin)
8. Customers can now purchase
```

---

### 5.3 Account Linking Flow (Customer)

```
1. Customer dashboard → "Payment Accounts" tab
2. Click "Add Account"
3. Modal opens with form:
   - Enter BVN
   - Select bank (dropdown of Nigerian banks)
   - Enter account number
4. Submit → Backend calls OnePipe lookup_bvn_min
5. If BVN matches account:
   - Account marked "verified"
   - Added to customer_accounts table
   - Set as primary if first account
6. If mismatch:
   - Show error: "BVN doesn't match account holder"
   - Customer can retry
7. Customer can add up to 3 accounts total
8. Drag-to-reorder priority (primary → backup 1 → backup 2)
```

---

## 6. UI/UX Mockups (Key Screens)

### 6.1 Product Listing Page

```
┌─────────────────────────────────────────────┐
│  Logo    [Search]    Cart(2)    Login       │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ Filters ───┐  ┌─ Products ────────────┐ │
│ │ Category    │  │ ┌─────┐ ┌─────┐       │ │
│ │ □ Electronics│  │ │ TV  │ │Phone│  ...  │ │
│ │ □ Furniture │  │ │₦120k│ │₦80k │       │ │
│ │ □ Fashion   │  │ └─────┘ └─────┘       │ │
│ │             │  │                        │ │
│ │ Price       │  │ [Show More Products]   │ │
│ │ ₦0 - ₦500k  │  └────────────────────────┘ │
│ └─────────────┘                            │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 6.2 Checkout Page (Installment Selection)

```
┌─────────────────────────────────────────────┐
│           Checkout - Payment Plan           │
├─────────────────────────────────────────────┤
│                                             │
│ Order Total: ₦120,000                       │
│                                             │
│ Choose Payment Plan:                        │
│                                             │
│ ○ Pay Full Amount (₦120,000)                │
│                                             │
│ ● Pay in 4 Months                           │
│   ₦30,000 × 4 payments                      │
│   Next payments: Feb 6, Mar 6, Apr 6        │
│                                             │
│ ○ Pay in 3 Months (₦40,000 × 3)             │
│ ○ Pay in 2 Months (₦60,000 × 2)             │
│                                             │
│ ─────────────────────────────────────────── │
│ Primary Account:                            │
│ [Access Bank - ...6789 ▼]                   │
│                                             │
│ [Authorize Payment] [Back to Cart]          │
└─────────────────────────────────────────────┘
```

---

### 6.3 Customer Dashboard - Payment Accounts

```
┌─────────────────────────────────────────────┐
│  Dashboard > Payment Accounts               │
├─────────────────────────────────────────────┤
│                                             │
│ [+ Add Account]                             │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Primary Account                       │   │
│ │ Access Bank - 0123456789              │   │
│ │ JOHN DOE                     ✓Verified│   │
│ │ [Edit Priority] [Remove]              │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Backup Account 1                      │   │
│ │ GTBank - 9876543210                   │   │
│ │ JOHN DOE                     ✓Verified│   │
│ │ [Edit Priority] [Remove]              │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ Monthly Commitment: ₦50,000                 │
│ (₦30k Order #001 + ₦20k Order #002)         │
└─────────────────────────────────────────────┘
```

---

### 6.4 Vendor Dashboard - Products

```
┌─────────────────────────────────────────────┐
│  Vendor Dashboard > Products                │
├─────────────────────────────────────────────┤
│                                             │
│ [+ Add Product]      [Import CSV]           │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Name         │ Price   │ Stock │ Actions│ │
│ ├──────────────┼─────────┼───────┼────────┤ │
│ │ Samsung TV   │ ₦120k   │ 15    │ Edit ✏️│ │
│ │ iPhone 14    │ ₦800k   │ 5     │ Edit ✏️│ │
│ │ Sofa Set     │ ₦250k   │ 0     │ Edit ✏️│ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Total Products: 23    Out of Stock: 1       │
└─────────────────────────────────────────────┘

7. Success Metrics
Phase 3 Demo Goals:

5 products uploaded by 2 test vendors
3 test customers with linked accounts
2 complete order flows (1 single payment, 1 installment)
Webhook successfully receives and processes payment notifications
Orders update status correctly in both customer and vendor dashboards

Post-Launch (Month 1):

10 active vendors
100 completed orders
₦5M GMV processed
< 5% payment failure rate


8. Development Phases
Phase 1: Core Infrastructure (Week 1)

Database setup
Auth system (login/register)
Basic product CRUD
Deploy backend + webhook endpoint

Phase 2: Customer Features (Week 1.5)

Product browsing
Cart functionality
Account linking (BVN verification)
Checkout with installment selection

Phase 3: Payment Integration (Week 2)

OnePipe API integration (send_invoice, lookup_bvn_min)
Webhook handler
Order status updates
Email/SMS notifications

Phase 4: Vendor Features (Week 2.5)

Vendor registration
Product upload
Order management
Earnings dashboard

Phase 5: Testing & Polish (Week 3)

UAT execution (all test cases)
Bug fixes
UI polish
Documentation


9. Tech Stack Summary
LayerTechnologyFrontendReact, TailwindCSS, React Router, React QueryBackendNode.js/Express or Python/FastAPIDatabasePostgreSQL (Supabase or AWS RDS)File StorageCloudinary or AWS S3HostingRailway/Render (backend), Vercel (frontend)PaymentsOnePipe PayWithAccount APINotificationsTwilio (SMS), SendGrid (Email)

10. Deliverables Checklist

 Frontend deployed (Vercel)
 Backend deployed with webhook endpoint (Railway)
 Webhook URL configured in OnePipe dashboard
 Database schema created and seeded with test data
 2 test vendor accounts created
 5 products uploaded
 3 test customer accounts with linked bank accounts
 2 test orders executed (UAT)
 UAT report documenting test results
 Live demo ready for Phase 4 presentation
```
