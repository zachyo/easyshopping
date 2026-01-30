# Easy Shopping - BNPL E-Commerce Platform

> **Buy Now, Pay Later** platform for Nigerian merchants and customers, powered by OnePipe payment infrastructure.

---

## Live Deployed Links

Frontend - https://creation-kit-plan.lovable.app

Backend - https://easyshopping-production.up.railway.app/

## 📚 Documentation Overview

This project contains comprehensive documentation to guide you through building the Easy Shopping platform with a focus on **payment and reconciliation flow**.

### Quick Navigation

| Document                                                 | Purpose                                    | When to Use                           |
| -------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| **[QUICK_START.md](./QUICK_START.md)**                   | Get webhook deployed in 30 minutes         | **START HERE** - Deploy backend first |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)**   | Complete step-by-step implementation guide | Full development roadmap              |
| **[WEBHOOK_FLOW.md](./WEBHOOK_FLOW.md)**                 | Detailed webhook integration guide         | Implementing payment webhooks         |
| **[PAYMENT_FLOW_SUMMARY.md](./PAYMENT_FLOW_SUMMARY.md)** | Visual flow diagrams and architecture      | Understanding the system              |
| **[prd.md](./prd.md)**                                   | Product Requirements Document              | Feature specifications                |

---

## 🎯 Project Overview

**Easy Shopping** is a BNPL (Buy Now, Pay Later) e-commerce platform that enables:

- **Customers** to purchase products in installments (2, 3, or 4 months)
- **Vendors** to increase sales by offering flexible payment options
- **Automated** payment collection and reconciliation via OnePipe

### Key Features

✅ **Installment Payments** - Split purchases into 2-4 monthly payments  
✅ **BVN Verification** - Secure account linking with OnePipe  
✅ **Automatic Debits** - Recurring payments without manual intervention  
✅ **Backup Accounts** - Automatic fallback if primary payment fails  
✅ **Real-time Reconciliation** - Webhook-based payment tracking  
✅ **Vendor Dashboard** - Product management and earnings tracking

---

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend   │────────▶│   OnePipe   │
│   (React)   │         │  (Node.js)  │         │     API     │
└─────────────┘         └─────────────┘         └─────────────┘
                               │                        │
                               ▼                        │
                        ┌─────────────┐                │
                        │  PostgreSQL │                │
                        └─────────────┘                │
                               ▲                        │
                               └────────────────────────┘
                                  Webhook Notifications
```

### Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS, React Query
- **Backend:** Node.js, Express, TypeScript, Sequelize
- **Database:** PostgreSQL (Supabase recommended)
- **Payments:** OnePipe PayWithAccount API
- **Hosting:** Railway (backend), Vercel (frontend)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- OnePipe API credentials ([Get here](https://paywithaccount.com))
- Railway/Render account for deployment

### Quick Start (30 minutes)

**The webhook endpoint must be deployed first** since OnePipe needs a URL to send payment notifications.

1. **Read the Quick Start Guide**

   ```bash
   # Open QUICK_START.md and follow the steps
   ```

2. **Deploy Webhook Endpoint**

   ```bash
   cd backend
   npm install
   npm run dev
   # Then deploy to Railway
   ```

3. **Configure OnePipe**
   - Add webhook URL in OnePipe dashboard
   - Get webhook secret
   - Update environment variables

4. **Test Webhook**
   ```bash
   curl -X POST https://your-app.railway.app/webhooks/onepipe \
     -H "Content-Type: application/json" \
     -d '{"event_type":"payment.success","mandate_id":"TEST"}'
   ```

### Full Implementation

Follow the **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** for complete development workflow:

- **Week 1:** Backend infrastructure + webhook + OnePipe integration
- **Week 2:** Frontend development + checkout flow + order tracking
- **Week 3:** Testing + polish + production deployment

---

## 💳 Payment Flow

### How It Works

1. **Customer** selects products and chooses installment plan (e.g., 4 months)
2. **Backend** creates order and calls OnePipe to create payment mandate
3. **OnePipe** returns virtual account details
4. **Customer** transfers first installment to virtual account
5. **OnePipe** detects payment and sends webhook to backend
6. **Backend** updates order status and notifies vendor to ship product
7. **OnePipe** auto-debits remaining installments monthly
8. **Webhook** updates order after each payment until completion

### Payment Example

```
Product: Samsung TV - ₦120,000
Plan: 4-month installment

Payment Schedule:
✅ Jan 21, 2026 - ₦30,000 (Customer transfers to virtual account)
⏳ Feb 21, 2026 - ₦30,000 (Auto-debit from customer account)
⏳ Mar 21, 2026 - ₦30,000 (Auto-debit from customer account)
⏳ Apr 21, 2026 - ₦30,000 (Auto-debit from customer account)

Total Paid: ₦120,000
```

See **[PAYMENT_FLOW_SUMMARY.md](./PAYMENT_FLOW_SUMMARY.md)** for detailed flow diagrams.

---

## 🔗 OnePipe Integration

### Required API Endpoints

| Endpoint         | Purpose                       | When Used            |
| ---------------- | ----------------------------- | -------------------- |
| `send_invoice`   | Create payment mandate        | During checkout      |
| `lookup_bvn_min` | Verify customer account       | When linking account |
| Webhook          | Receive payment notifications | After each payment   |

### Webhook Endpoint

```
POST https://your-app.railway.app/webhooks/onepipe
```

**Payload Example:**

```json
{
  "event_type": "payment.success",
  "mandate_id": "OPM_1234567890",
  "transaction_reference": "TXN_0987654321",
  "amount": 30000,
  "installment_number": 1,
  "status": "success"
}
```

See **[WEBHOOK_FLOW.md](./WEBHOOK_FLOW.md)** for complete webhook implementation.

---

## 📊 Key Features

### Customer Features

- ✅ Product browsing with filters
- ✅ Shopping cart
- ✅ Installment checkout (2, 3, 4 months)
- ✅ Bank account linking (BVN verification)
- ✅ Order tracking with payment timeline
- ✅ Profile management

### Vendor Features

- ✅ Product upload with images
- ✅ Inventory management
- ✅ Order management
- ✅ Earnings dashboard
- ✅ Settlement reports

### Admin Features

- ✅ Vendor approval workflow
- ✅ Platform configuration
- ✅ Reconciliation dashboard
- ✅ Webhook logs viewer
- ✅ System metrics

---

## 🧪 Testing

### Test Scenarios

1. **Account Linking**
   - Add bank account with BVN verification
   - Set account priority
   - Remove account

2. **Order Creation**
   - Create order with installment plan
   - Verify mandate created in OnePipe
   - Check virtual account details

3. **Payment Processing**
   - Simulate webhook for successful payment
   - Verify order status updated
   - Check notifications sent

4. **Payment Failure**
   - Simulate failed payment webhook
   - Verify backup account fallback
   - Check customer notification

5. **Order Completion**
   - Process all installments
   - Verify order marked as completed
   - Check settlement calculation

---

## 📈 Success Metrics

### Demo Goals (Phase 3)

- ✅ 5 products uploaded by 2 test vendors
- ✅ 3 test customers with linked accounts
- ✅ 2 complete order flows (1 single payment, 1 installment)
- ✅ Webhook successfully processes payment notifications
- ✅ >95% payment success rate

### Post-Launch (Month 1)

- 10 active vendors
- 100 completed orders
- ₦5M GMV processed
- <5% payment failure rate

---

## 🔐 Security

### Webhook Security

- ✅ Signature verification (HMAC SHA256)
- ✅ HTTPS only
- ✅ Rate limiting
- ✅ Idempotency checks

### Data Security

- ✅ BVN encryption at rest
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS configuration

---

## 📁 Project Structure

```
easy-shopping-platform/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── webhooks.ts       # Webhook endpoint
│   │   ├── models/               # Database models
│   │   ├── services/
│   │   │   └── onepipe.service.ts # OnePipe API integration
│   │   ├── middleware/           # Auth, validation
│   │   └── index.ts              # Server entry point
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Checkout.tsx      # Installment selection
│   │   │   ├── Orders.tsx        # Order tracking
│   │   │   └── Accounts.tsx      # Account management
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── package.json
│
├── QUICK_START.md                # 30-minute setup guide
├── IMPLEMENTATION_PLAN.md        # Full development roadmap
├── WEBHOOK_FLOW.md               # Webhook integration guide
├── PAYMENT_FLOW_SUMMARY.md       # Visual flow diagrams
├── prd.md                        # Product requirements
└── README.md                     # This file
```

---

## 🛠️ Development Workflow

### Phase 1: Backend + Webhook (Week 1)

1. Initialize backend project
2. Create webhook endpoint
3. Deploy to Railway
4. Configure OnePipe webhook URL
5. Implement OnePipe API integration
6. Build payment reconciliation logic

### Phase 2: Frontend (Week 2)

1. Initialize React project
2. Build authentication pages
3. Create account linking UI
4. Implement checkout flow
5. Build order tracking
6. Add vendor features

### Phase 3: Testing + Launch (Week 3)

1. End-to-end testing
2. UAT execution
3. Bug fixes
4. UI polish
5. Production deployment
6. Demo preparation

---

## 📞 Support

### Resources

- **OnePipe Docs:** https://docs.paywithaccount.com/
- **Railway Docs:** https://docs.railway.app/
- **Supabase Docs:** https://supabase.com/docs

### Troubleshooting

- Check **[QUICK_START.md](./QUICK_START.md)** for common issues
- Review **[WEBHOOK_FLOW.md](./WEBHOOK_FLOW.md)** for webhook debugging
- See **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** for detailed steps

---

## 🎯 Next Steps

1. **Read [QUICK_START.md](./QUICK_START.md)** - Deploy webhook in 30 minutes
2. **Get OnePipe credentials** - Sign up at https://paywithaccount.com
3. **Deploy backend** - Follow quick start guide
4. **Configure webhook** - Add URL in OnePipe dashboard
5. **Test webhook** - Verify payment notifications work
6. **Build frontend** - Follow implementation plan
7. **Go live!** 🚀

---

## 📝 License

This project is for educational and commercial use.

---

## 🤝 Contributing

This is a private project. For questions or support, contact the development team.

---

**Ready to start building?**

👉 **Begin with [QUICK_START.md](./QUICK_START.md)** to get your webhook endpoint deployed!

---

Built with ❤️ for Nigerian merchants and customers
