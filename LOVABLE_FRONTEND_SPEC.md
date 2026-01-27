# E-Commerce BNPL Platform - Frontend Specification (Dual Auth)

## Project Overview

Build a **Buy Now, Pay Later (BNPL)** e-commerce platform for Nigerian customers and vendors. Customers can purchase products in installments (2-4 months) with automatic payment collection via OnePipe. Vendors can upload products, manage inventory, and track sales.

**Authentication:** Support both **OAuth** (Google, Facebook, Twitter) and **Email/Password** authentication.

---

## Authentication Methods

### Primary: OAuth (Recommended)

- One-click sign in with Google, Facebook, or Twitter
- No password to remember
- Automatic email verification
- Profile picture from social account

### Secondary: Email/Password

- Traditional registration with email and password
- Password securely hashed with bcrypt
- Password reset flow available
- Full control over account

**Users can choose their preferred method - both are equally secure!**

---

## Core Features

### 1. Customer Features

- Browse products with search and filters
- Purchase products with flexible payment options:
  - **Daily (One-time)**: Full payment immediately
  - **Weekly**: 1, 2, or 3 weeks
  - **Monthly**: 1, 2, or 3 months
- Link bank accounts with BVN verification
- Track orders and payment schedules
- View payment history

### 2. Vendor Features

- Register and create vendor profile
- Upload products with images, pricing, and inventory
- Manage product catalog (create, edit, delete)
- View and manage orders
- Track sales and earnings
- View settlement reports

### 3. Payment System

- Flexible payment frequency selection (daily, weekly, monthly)
- OnePipe integration for recurring payments
- Virtual account generation for first payment
- Automatic debits based on selected frequency:
  - **Daily**: One-time full payment (no recurring debits)
  - **Weekly**: Every 7 days (1-3 weeks)
  - **Monthly**: Every 30 days (1-3 months)
- Backup account fallback on payment failure

---

## User Roles

### Customer

- **Authentication**: OAuth (Google/Facebook/Twitter) OR Email/Password
- **OAuth users**: Complete profile with phone number and BVN after first login
- **Email/Password users**: Provide all details during registration
- Can link up to 3 bank accounts (priority: primary + 2 backups)
- Can browse products and make purchases
- Can track order status and payment timeline

### Vendor

- **Authentication**: OAuth (Google/Facebook/Twitter) OR Email/Password
- **OAuth users**: Complete profile with business details after first login
- **Email/Password users**: Provide all details during registration
- **No admin verification required** - vendors can start uploading products immediately
- Can upload and manage products
- Can view orders for their products
- Can track earnings and settlements

---

## Key Pages & Components

### Public Pages

#### 1. Landing Page

- Hero section with value proposition
- How it works (3-step process)
- Featured products
- Benefits for customers and vendors
- CTA buttons (Shop Now, Become a Vendor)

#### 2. Product Catalog (`/products`)

- Product grid with images, names, prices
- Search bar
- Filters: category, price range
- Pagination
- Product cards showing:
  - Product image
  - Product name
  - Price (with installment preview: "From ₦X/month")
  - Stock status

#### 3. Product Detail (`/products/:id`)

- Large product images (gallery)
- Product name, description, price
- Stock availability
- Payment calculator showing breakdown for:
  - **Pay in Full** (Daily - one-time payment)
  - **Weekly**: 1, 2, or 3 weeks
  - **Monthly**: 1, 2, or 3 months
- Add to cart button
- Vendor information

### Authentication Pages

#### 4. Login Page (`/login`)

**Default View: OAuth (Recommended)**

- "Continue with Google" button
- "Continue with Facebook" button
- "Continue with Twitter" button
- Divider: "OR"
- Link: "Sign in with email" → switches to email/password form

**Email/Password View:**

- Email input
- Password input
- "Sign In" button
- "Forgot password?" link
- Link: "← Back to OAuth login"

**After successful login:**

- OAuth new users → Role selection page
- OAuth existing users → Dashboard (based on role)
- Email/Password users → Dashboard (based on role)

#### 5. Register Page (`/register`)

**Default View: OAuth (Recommended)**

- Badge: "Recommended"
- "Continue with Google" button
- "Continue with Facebook" button
- "Continue with Twitter" button
- Divider: "OR"
- Link: "Sign up with email" → switches to email/password form

**Email/Password View - Customer:**

- Email input
- Password input (with strength indicator)
- First Name input
- Last Name input
- Phone Number input
- BVN input (11 digits)
- "Create Account" button
- Link: "← Back to OAuth signup"

**Email/Password View - Vendor:**

- Email input
- Password input (with strength indicator)
- Business Name input
- Business Category dropdown
- Settlement Account Number input
- Settlement Bank Code dropdown
- Phone Number input
- "Create Account" button
- Link: "← Back to OAuth signup"

**After successful registration:**

- Email/Password users → Dashboard (profile already complete)
- OAuth users → Role selection page

#### 6. Role Selection (`/select-role`) - OAuth Users Only

- Shown after OAuth login for new users
- Two options:
  - "I'm a Customer" → Redirect to `/complete-profile/customer`
  - "I'm a Vendor" → Redirect to `/complete-profile/vendor`
- Clean card-based selection UI
- Icons and descriptions for each role

#### 7. Profile Completion - Customer (`/complete-profile/customer`) - OAuth Users Only

- Shown only for new customers after OAuth login
- Form fields:
  - Phone Number (required)
  - BVN (11 digits, required)
- Pre-filled from OAuth:
  - Name (from OAuth profile, read-only)
  - Email (from OAuth profile, read-only)
  - Profile picture (from OAuth profile, displayed)
- Submit → Redirect to customer dashboard

#### 8. Profile Completion - Vendor (`/complete-profile/vendor`) - OAuth Users Only

- Shown only for new vendors after OAuth login
- Form fields:
  - Business Name (required)
  - Business Category (dropdown, required)
  - Settlement Account Number (10 digits, required)
  - Settlement Bank Code (dropdown, required)
  - Phone Number (required)
- Pre-filled from OAuth:
  - Email (from OAuth profile, read-only)
  - Profile picture (from OAuth profile, displayed)
- Submit → Redirect to vendor dashboard

#### 9. Forgot Password (`/forgot-password`) - Email/Password Users Only

- Email input
- "Send Reset Link" button
- Success message: "Check your email for reset instructions"
- Link: "← Back to login"

#### 10. Reset Password (`/reset-password/:token`) - Email/Password Users Only

- New Password input (with strength indicator)
- Confirm Password input
- "Reset Password" button
- Success → Redirect to login

### Customer Pages

#### 11. Customer Dashboard (`/dashboard`)

- Welcome message with customer name
- Profile picture (if OAuth user)
- Quick stats: Active orders, Total spent, Upcoming payments
- Recent orders list
- Linked bank accounts summary
- Quick actions: Browse products, Add account, View orders

#### 12. Bank Accounts Management (`/dashboard/accounts`)

- List of linked accounts with:
  - Bank name
  - Account number (masked: ...6789)
  - Account name
  - Priority badge (Primary, Backup 1, Backup 2)
  - Verification status
- Add Account button → Modal with:
  - BVN input
  - Bank dropdown (Nigerian banks)
  - Account number input
  - Submit → BVN verification via API
- Drag-and-drop to reorder priority
- Delete account option

#### 13. Checkout (`/checkout`)

- Cart summary (items, quantities, subtotal)
- Payment frequency selector:
  - **Pay in Full** (Daily - one-time payment, full amount)
  - **Weekly** (1, 2, or 3 weeks)
  - **Monthly** (1, 2, or 3 months)
- For weekly/monthly, show installment count dropdown:
  - Weekly: Select 1, 2, or 3 weeks
  - Monthly: Select 1, 2, or 3 months
  - Pay in Full: No selection needed (single payment)
- For each selection, show:
  - Amount per payment
  - Total amount
  - Payment schedule preview with dates
  - Frequency (e.g., "One-time", "Every 7 days" or "Every 30 days")
- Select payment account (dropdown of linked accounts)
- Shipping address input
- Review and confirm button
- After order creation:
  - Display virtual account details
  - Bank name
  - Account number
  - Amount to transfer (first payment or full amount)
  - Transfer instructions
  - Payment frequency reminder (if recurring)
  - "I've made the transfer" button → redirect to order tracking

#### 14. Orders List (`/dashboard/orders`)

- Table/cards showing:
  - Order ID
  - Date
  - Products (with thumbnails)
  - Total amount
  - Payment plan (e.g., "3 weeks" or "2 months" or "Paid in Full")
  - Status badge (Pending, Active, Completed, Failed)
  - Payment progress (e.g., "2/3 paid" or "Paid" for one-time)
- Filter by status
- Click order → Order detail page

#### 15. Order Detail (`/dashboard/orders/:id`)

- Order information:
  - Order ID, date, status
  - Products list with images, names, quantities, prices
  - Total amount
  - Payment frequency (One-time/Weekly/Monthly)
- Payment timeline:
  - Visual timeline showing all payments
  - For one-time (daily): Single payment status
  - For weekly/monthly: Each payment with:
    - Payment number (1/3, 2/3, etc.)
    - Amount
    - Due date (based on frequency)
    - Status (Paid ✅, Pending ⏳, Failed ❌)
    - Payment date (if paid)
    - Frequency indicator ("Every 7 days" or "Every 30 days")
- Payment account used
- Shipping address
- Download invoice button

### Vendor Pages

#### 16. Vendor Dashboard (`/vendor/dashboard`)

- Welcome message with business name
- Profile picture (if OAuth user)
- Quick stats:
  - Total products
  - Active orders
  - Total sales (gross)
  - Pending settlements
- Recent orders list
- Quick actions: Add product, View orders, View earnings

#### 17. Product Management (`/vendor/products`)

- Products table with:
  - Product image thumbnail
  - Product name
  - Price
  - Stock quantity
  - Status (Active/Inactive)
  - Actions (Edit, Delete)
- Add Product button → Product form
- Search and filter products

#### 18. Product Form (`/vendor/products/new` and `/vendor/products/:id/edit`)

- Form fields:
  - Product name
  - Description (textarea)
  - Price (₦)
  - Category (dropdown)
  - Stock quantity
  - Images (upload up to 5 images)
- Image upload with preview
- Save button
- Cancel button

#### 19. Vendor Orders (`/vendor/orders`)

- Orders table with:
  - Order ID
  - Customer name
  - Product(s)
  - Amount
  - Payment plan (e.g., "Weekly - 3 weeks" or "Monthly - 2 months")
  - Payment status (e.g., "2/3 paid" or "Paid")
  - Order status
  - Date
- Filter by status
- Click order → Order detail (similar to customer view but with customer info)

#### 20. Earnings Dashboard (`/vendor/earnings`)

- Summary cards:
  - Gross sales
  - Platform fees (2%)
  - Net earnings
  - Pending settlements
- Revenue chart (by month)
- Transaction history table:
  - Date
  - Order ID
  - Customer
  - Gross amount
  - Fee
  - Net amount
  - Settlement status
- Export to CSV button

---

## API Integration

### Base URL

```
Development: http://localhost:3000
Production: https://your-backend.railway.app
```

### Authentication

All protected endpoints require JWT token in header:

```
Authorization: Bearer <token>
```

### Key Endpoints

#### Authentication - Email/Password

- `POST /api/auth/register/customer` - Register customer with email/password
- `POST /api/auth/register/vendor` - Register vendor with email/password
- `POST /api/auth/login` - Login with email/password (returns token)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password with token

#### Authentication - OAuth

- `POST /api/auth/oauth/google` - Authenticate with Google OAuth
- `POST /api/auth/oauth/facebook` - Authenticate with Facebook OAuth
- `POST /api/auth/oauth/twitter` - Authenticate with Twitter OAuth
- `POST /api/auth/complete-profile/customer` - Complete customer profile after OAuth
- `POST /api/auth/complete-profile/vendor` - Complete vendor profile after OAuth

#### Common Auth Endpoints

- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout (invalidate token)

#### Customer Accounts

- `GET /api/customers/:customerId/accounts` - List bank accounts
- `POST /api/customers/:customerId/accounts` - Add account (BVN verification)
- `PUT /api/customers/:customerId/accounts/:accountId` - Update priority
- `DELETE /api/customers/:customerId/accounts/:accountId` - Remove account

#### Products

- `GET /api/products` - List products (public, with filters)
- `GET /api/products/:productId` - Get product details
- `POST /api/products` - Create product (vendor only)
- `PUT /api/products/:productId` - Update product (vendor only)
- `DELETE /api/products/:productId` - Delete product (vendor only)

#### Orders

- `POST /api/orders` - Create order with payment plan (frequency + count)
- `GET /api/orders` - List customer orders
- `GET /api/orders/:orderId` - Get order details

---

## Data Models

### Customer (Email/Password)

```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  bvn: string;
  password: string; // Bcrypt hashed (never exposed in API)
  profileCompleted: boolean; // Always true
  createdAt: Date;
}
```

### Customer (OAuth)

```typescript
{
  id: string;
  email: string; // from OAuth
  firstName: string; // from OAuth
  lastName: string; // from OAuth
  profilePicture?: string; // from OAuth
  oauthProvider: 'google' | 'facebook' | 'twitter';
  oauthId: string; // unique ID from OAuth provider
  phone: string; // from profile completion
  bvn: string; // from profile completion
  profileCompleted: boolean;
  createdAt: Date;
}
```

### Vendor (Email/Password)

```typescript
{
  id: string;
  email: string;
  businessName: string;
  businessCategory: string;
  settlementAccountNumber: string;
  settlementBankCode: string;
  phone: string;
  password: string; // Bcrypt hashed (never exposed in API)
  verified: boolean; // Always true (no admin verification)
  profileCompleted: boolean; // Always true
  createdAt: Date;
}
```

### Vendor (OAuth)

```typescript
{
  id: string;
  email: string; // from OAuth
  firstName?: string; // from OAuth (optional)
  lastName?: string; // from OAuth (optional)
  profilePicture?: string; // from OAuth
  oauthProvider: 'google' | 'facebook' | 'twitter';
  oauthId: string; // unique ID from OAuth provider
  businessName: string; // from profile completion
  businessCategory: string; // from profile completion
  settlementAccountNumber: string; // from profile completion
  settlementBankCode: string; // from profile completion
  phone: string; // from profile completion
  verified: boolean; // Always true (no admin verification)
  profileCompleted: boolean;
  createdAt: Date;
}
```

### Product

```typescript
{
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stockQuantity: number;
  images: string[]; // URLs
  active: boolean;
  createdAt: Date;
}
```

### Order

```typescript
{
  id: string;
  customerId: string;
  totalAmount: number;
  paymentFrequency: 'daily' | 'weekly' | 'monthly';
  paymentCount: number; // 1 for daily, 1-3 for weekly, 1-3 for monthly
  amountPerPayment: number;
  paymentsMade: number;
  amountPaid: number;
  status: 'pending' | 'authorized' | 'active' | 'completed' | 'failed';
  shippingAddress: string;
  items: OrderItem[];
  createdAt: Date;
}
```

### OrderItem

```typescript
{
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}
```

### CustomerAccount

```typescript
{
  id: string;
  customerId: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  priority: number; // 1 = primary, 2-3 = backup
  verified: boolean;
  bvnVerifiedAt: Date;
}
```

### Mandate (Payment Schedule)

```typescript
{
  id: string;
  orderId: string;
  onepipeMandateId: string;
  virtualAccount: string;
  paymentFrequency: "daily" | "weekly" | "monthly";
  totalPayments: number; // 1 for daily, 1-3 for weekly/monthly
  paymentsMade: number;
  amountPerPayment: number;
  frequencyInDays: number; // 1 for daily, 7 for weekly, 30 for monthly
  status: "pending_auth" | "active" | "completed" | "failed";
}
```

---

## Design Guidelines

### Color Scheme

- Primary: Emerald/Green (#10b981) - for success, payments
- Secondary: Blue (#3b82f6) - for actions
- Accent: Purple (#8b5cf6) - for highlights
- Success: Green (#22c55e)
- Warning: Yellow (#eab308)
- Error: Red (#ef4444)
- Neutral: Gray scale (#f9fafb to #111827)

### Typography

- Headings: Bold, large (text-2xl to text-4xl)
- Body: Regular, readable (text-base)
- Small text: text-sm for labels, captions

### Components Style

- Cards: White background, subtle shadow, rounded corners
- Buttons: Solid colors, rounded, with hover states
- Forms: Clean inputs with labels, validation messages
- Tables: Striped rows, hover effects
- Badges: Small, rounded, colored by status
- Modals: Centered, overlay background

### OAuth Buttons

- Google: White background, Google logo, "Continue with Google"
- Facebook: Facebook blue (#1877F2), Facebook logo, "Continue with Facebook"
- Twitter: Twitter blue (#1DA1F2), Twitter logo, "Continue with Twitter"
- Use official brand guidelines for each provider

### Status Colors

- Pending: Yellow/Orange
- Active: Blue
- Completed: Green
- Failed: Red
- Paid: Green with checkmark
- Unpaid: Gray

### Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Stack elements vertically on mobile
- Use hamburger menu for navigation on mobile

---

## User Flows

### Customer Purchase Flow (OAuth)

1. Browse products → Select product
2. View product details → Click "Buy Now"
3. If not logged in → OAuth login (Google/Facebook/Twitter)
4. If new user → Select "Customer" role → Complete profile (phone, BVN)
5. If no bank account → Add bank account (BVN verification)
6. Select payment option:
   - **Pay in Full** (one-time payment)
   - **Weekly** (select 1, 2, or 3 weeks)
   - **Monthly** (select 1, 2, or 3 months)
7. Review order and payment schedule with dates
8. Confirm order → Receive virtual account details
9. Transfer payment to virtual account (full amount or first installment)
10. Order activated → Product ships
11. For recurring: Automatic debits based on frequency (weekly/monthly)
12. Track order and payment progress in dashboard

### Customer Purchase Flow (Email/Password)

1. Browse products → Select product
2. View product details → Click "Buy Now"
3. If not logged in → Login or Register with email/password
4. If no bank account → Add bank account (BVN verification)
5. Select payment option:
   - **Pay in Full** (one-time payment)
   - **Weekly** (select 1, 2, or 3 weeks)
   - **Monthly** (select 1, 2, or 3 months)
6. Review order and payment schedule with dates
7. Confirm order → Receive virtual account details
8. Transfer payment to virtual account (full amount or first installment)
9. Order activated → Product ships
10. For recurring: Automatic debits based on frequency (weekly/monthly)
11. Track order and payment progress in dashboard

### Vendor Product Upload Flow (OAuth)

1. OAuth login (Google/Facebook/Twitter)
2. If new user → Select "Vendor" role → Complete profile (business details)
3. Redirect to vendor dashboard
4. Click "Add Product"
5. Fill product form (name, price, description, category, stock, images)
6. Upload product images
7. Save product → Product appears in catalog
8. Customers can now purchase the product
9. Vendor receives order notifications
10. Vendor marks order as shipped
11. Vendor tracks earnings in dashboard

### Vendor Product Upload Flow (Email/Password)

1. Register with email/password (provide all business details)
2. Login → Redirect to vendor dashboard
3. Click "Add Product"
4. Fill product form (name, price, description, category, stock, images)
5. Upload product images
6. Save product → Product appears in catalog
7. Customers can now purchase the product
8. Vendor receives order notifications
9. Vendor marks order as shipped
10. Vendor tracks earnings in dashboard

### Payment Failure & Backup Flow

1. Automatic debit fails on primary account (based on payment frequency)
2. System automatically tries backup account (priority 2)
3. If backup succeeds → Payment recorded, customer notified
4. If all accounts fail → Customer notified to update payment method
5. Customer can add new account or update existing
6. Next payment attempt occurs based on frequency (daily/weekly/monthly)

---

## Technical Requirements

### Frontend Stack

- **Framework**: React with TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Query for server state, Context API for auth
- **Routing**: React Router
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Charts**: Recharts (for earnings dashboard)
- **Image Upload**: Cloudinary or similar
- **OAuth**: OAuth libraries for each provider

### Key Features to Implement

- **Dual Authentication**: Support both OAuth and email/password
- JWT token storage in localStorage
- Protected routes (redirect to login if not authenticated)
- Role-based routing (customer vs vendor dashboards)
- Profile completion flow for OAuth users
- Password strength indicator for email/password registration
- Forgot password / reset password flow
- Form validation with error messages
- Loading states for API calls and OAuth redirects
- Error handling and user feedback (toasts/alerts)
- Responsive navigation (desktop: navbar, mobile: hamburger menu)
- Image upload with preview
- Search and filter functionality
- Pagination for product lists
- Date formatting for Nigerian timezone
- Currency formatting (₦ symbol, thousands separator)

### OAuth Implementation

```typescript
// OAuth providers configuration
const oauthProviders = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    redirectUri: `${window.location.origin}/auth/callback/google`,
    scope: "profile email",
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID,
    redirectUri: `${window.location.origin}/auth/callback/facebook`,
    scope: "email public_profile",
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID,
    redirectUri: `${window.location.origin}/auth/callback/twitter`,
    scope: "users.read tweet.read",
  },
};

// OAuth flow
// 1. User clicks "Continue with Google"
// 2. Redirect to Google OAuth consent screen
// 3. Google redirects back to /auth/callback/google with code
// 4. Frontend sends code to backend: POST /api/auth/oauth/google
// 5. Backend exchanges code for user info, creates/updates user, returns JWT
// 6. Frontend stores JWT and redirects based on profile completion status
```

### Password Validation

```typescript
// Password strength requirements
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional
};

// Strength indicator levels
// Weak: < 8 characters or missing requirements
// Medium: 8+ characters, meets basic requirements
// Strong: 12+ characters, meets all requirements
```

### Nigerian Banks (for dropdowns)

```typescript
const nigerianBanks = [
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Diamond Bank" },
  { code: "050", name: "Ecobank" },
  { code: "214", name: "FCMB" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank" },
  { code: "058", name: "GTBank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Parallex Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC" },
  { code: "068", name: "Standard Chartered" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "UBA" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];
```

### Product Categories

```typescript
const categories = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Books & Media",
  "Toys & Games",
  "Automotive",
  "Health & Wellness",
  "Office Supplies",
];
```

---

## Success Metrics

### For Demo/MVP

- 5+ products uploaded by 2+ vendors
- 3+ customers with linked bank accounts
- 2+ complete order flows (1 full payment, 1 installment)
- Both OAuth and email/password authentication working
- All user flows working end-to-end
- Responsive design on mobile and desktop

### Post-Launch Goals

- 10+ active vendors
- 100+ products in catalog
- 50+ completed orders
- > 95% payment success rate
- <5% payment failure rate
- 70%+ users prefer OAuth (indicates good UX)

---

## Important Notes

1.  **Dual Authentication**: Support both OAuth and email/password. Default to OAuth (recommended), but allow users to choose email/password if preferred.

2.  **Password Security**: Passwords are hashed with bcrypt (10+ rounds) and never stored in plain text. Very secure when implemented correctly.

3.  **Profile Completion**: OAuth users must complete their profile after first login. Email/password users provide all details during registration.

4.  **No Admin Verification**: Vendors can register and start uploading products immediately. No admin approval workflow needed.

5.  **BVN Verification**: When customers add bank accounts, the backend calls OnePipe API to verify BVN matches the account. Show loading state during verification.

6.  **Virtual Accounts**: After order creation, display virtual account details prominently with clear instructions for the customer to transfer the payment (full amount for one-time, or first installment for recurring). Show payment frequency clearly.

7.  **Payment Timeline**: Show clear visual timeline of payments with status indicators (paid, pending, failed). For one-time payments, show single payment. For recurring, display frequency (weekly/monthly) and due dates clearly.

8.  **Backup Accounts**: Allow customers to link up to 3 accounts. Explain that backup accounts will be used if primary payment fails.

9.  **Currency**: Always display amounts in Nigerian Naira (₦) with proper formatting (e.g., ₦120,000).

10. **Payment Calculator**: On product pages, show payment breakdown for all options (Pay in Full, weekly 1-3, monthly 1-3) to help customers understand payment options before checkout.

11. **Error Handling**: Provide clear, user-friendly error messages for API failures, validation errors, OAuth errors, password errors, etc.

12. **Loading States**: Show spinners/skeletons during API calls and OAuth redirects to improve perceived performance.

13. **Mobile-First**: Prioritize mobile experience as most Nigerian users will access via mobile devices.

14. **OAuth Security**: Always use HTTPS for OAuth redirects. Validate state parameter to prevent CSRF attacks. Handle OAuth errors gracefully.

15. **Password Reset**: Implement forgot password / reset password flow for email/password users. Send reset link via email with time-limited token.

---

## Build Priority

### Phase 1: Core Customer Flow (Week 1)

1. Landing page
2. Dual authentication (OAuth + Email/Password)
3. Profile completion flow (for OAuth users)
4. Password reset flow (for email/password users)
5. Product catalog and detail pages
6. Bank account management
7. Checkout flow
8. Order tracking

### Phase 2: Vendor Features (Week 2)

1. Vendor dashboard
2. Product management (CRUD)
3. Order management
4. Earnings dashboard
5. Profile settings (update business info)

### Phase 3: Polish & Optimization (Week 3)

1. Responsive design refinement
2. Error handling improvements
3. Loading states and animations
4. Search and filter optimization
5. Performance optimization
6. Testing and bug fixes
7. Security audit (OAuth + password flows)

---

## Summary

This is a **minimalist BNPL e-commerce platform** with **flexible authentication**. Users can choose between OAuth (recommended) or email/password authentication. Customers can browse products, purchase with installments, and track payments. Vendors can upload products and track sales. The backend handles OnePipe integration for BVN verification and recurring payments. Build with modern, clean UI using React and TailwindCSS, prioritizing mobile responsiveness, security, and user experience.

**Authentication is flexible - users choose what works best for them!**
