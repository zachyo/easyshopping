# Easy Shopping Backend

Backend API for the Easy Shopping BNPL (Buy Now Pay Later) platform with OnePipe payment integration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OnePipe API credentials

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Create PostgreSQL database
createdb easy_shopping

# Run database migrations
psql -d easy_shopping -f database/schema.sql

# Start development server
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Database connection
│   ├── models/
│   │   ├── User.ts              # User authentication
│   │   ├── Customer.ts          # Customer profiles
│   │   ├── CustomerAccount.ts   # Bank accounts
│   │   ├── Vendor.ts            # Vendor profiles
│   │   ├── Product.ts           # Product catalog
│   │   ├── Order.ts             # Orders
│   │   ├── Mandate.ts           # Payment mandates
│   │   └── PaymentAttempt.ts    # Webhook logs
│   ├── services/
│   │   └── onepipe.service.ts   # OnePipe API integration
│   ├── routes/
│   │   └── webhooks.ts          # Webhook endpoints
│   └── server.ts                # Express app
├── database/
│   └── schema.sql               # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔑 Environment Variables

Required environment variables (see `.env.example`):

- `ONEPIPE_API_KEY` - Your OnePipe API key
- `ONEPIPE_CLIENT_SECRET` - Your OnePipe client secret
- `ONEPIPE_WEBHOOK_SECRET` - Webhook signature verification secret
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL credentials

## 🪝 Webhook Integration

### Webhook Endpoint

```
POST https://your-domain.com/webhooks/onepipe
```

### Configure in OnePipe Dashboard

1. Deploy backend to Railway/Render
2. Get public HTTPS URL
3. Add webhook URL in OnePipe dashboard
4. Set webhook secret in environment variables

### Testing Webhook Locally

```bash
# Install ngrok
npm install -g ngrok

# Start backend
npm run dev

# Expose local server
ngrok http 3000

# Use ngrok URL in OnePipe dashboard
```

## 🔒 Security Features

- ✅ Webhook signature verification (HMAC SHA256)
- ✅ Idempotency checks (prevent duplicate processing)
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Input validation

## 📊 API Endpoints

### Health Check

```
GET /health
```

### Webhook

```
POST /webhooks/onepipe
GET /webhooks/health
```

### Coming Soon

- Authentication (`/api/auth`)
- Customers (`/api/customers`)
- Orders (`/api/orders`)
- Products (`/api/products`)

## 🧪 Testing

```bash
# Run tests (coming soon)
npm test

# Test webhook manually
curl -X POST http://localhost:3000/webhooks/onepipe \
  -H "Content-Type: application/json" \
  -H "x-onepipe-signature: test_signature" \
  -d '{
    "event_type": "payment.success",
    "mandate_id": "OPM_TEST123",
    "transaction_reference": "TXN_TEST456",
    "amount": 30000,
    "installment_number": 1,
    "status": "success"
  }'
```

## 🚢 Deployment

### Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL database
railway add

# Deploy
railway up
```

### Environment Variables (Production)

Set these in Railway dashboard:

- `NODE_ENV=production`
- `ONEPIPE_MOCK_MODE=false`
- All other variables from `.env.example`

## 📝 Database Schema

See `database/schema.sql` for complete schema.

Key tables:

- `users` - Authentication
- `customers` - Customer profiles with BVN
- `customer_accounts` - Linked bank accounts (with priority)
- `orders` - Orders with installment tracking
- `mandates` - OnePipe payment mandates
- `payment_attempts` - Webhook logs

## 🔄 Payment Flow

1. Customer selects installment plan at checkout
2. Backend calls OnePipe `send_invoice` API
3. OnePipe returns virtual account details
4. Customer transfers first installment
5. OnePipe sends webhook notification
6. Backend processes payment and updates order
7. Subsequent installments auto-debited monthly
8. Webhook updates order status on each payment

## 🛠️ Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## 📚 Documentation

- [OnePipe API Docs](https://docs.paywithaccount.com/)
- [Implementation Plan](../IMPLEMENTATION_PLAN.md)
- [Webhook Flow](../WEBHOOK_FLOW.md)
- [PRD](../prd.md)

## 🐛 Troubleshooting

### Webhook not receiving events

- Check webhook URL is correct in OnePipe dashboard
- Verify HTTPS is enabled
- Check firewall/security groups
- Test with ngrok locally

### Database connection errors

- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists

### OnePipe API errors

- Verify API credentials
- Check `mock_mode` setting
- Review request/response logs

## 📄 License

MIT
