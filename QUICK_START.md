# Quick Start Guide - Easy Shopping BNPL Platform

## Get Started in 30 Minutes

This guide will help you set up the **backend with webhook endpoint** first, since OnePipe needs a webhook URL to send payment notifications.

---

## Prerequisites

Before you start, make sure you have:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed (or Supabase account)
- [ ] OnePipe API credentials (get from https://paywithaccount.com)
- [ ] Railway/Render account (for deployment)
- [ ] Git installed

---

## Step 1: Initialize Backend (10 minutes)

```bash
# Create project directory
mkdir easy-shopping-platform
cd easy-shopping-platform

# Create backend directory
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors dotenv pg sequelize bcryptjs jsonwebtoken axios helmet express-rate-limit morgan

# Install dev dependencies
npm install --save-dev nodemon typescript @types/node @types/express @types/bcryptjs @types/jsonwebtoken ts-node

# Initialize TypeScript
npx tsc --init
```

### Create Project Structure

```bash
mkdir -p src/{routes,models,services,middleware,config}
touch src/index.ts
touch src/routes/webhooks.ts
touch .env
touch .env.example
```

Your structure should look like:

```
backend/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   └── webhooks.ts
│   ├── models/
│   ├── services/
│   ├── middleware/
│   └── config/
├── package.json
├── tsconfig.json
├── .env
└── .env.example
```

---

## Step 2: Create Webhook Endpoint (15 minutes)

### File: `src/index.ts`

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import webhookRoutes from "./routes/webhooks";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Webhook routes
app.use("/webhooks", webhookRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/webhooks/onepipe`);
});
```

### File: `src/routes/webhooks.ts`

```typescript
import express, { Request, Response } from "express";
import crypto from "crypto";

const router = express.Router();

// Webhook endpoint for OnePipe
router.post("/onepipe", async (req: Request, res: Response) => {
  try {
    console.log("📨 Webhook received:", JSON.stringify(req.body, null, 2));

    // Verify signature
    const signature = req.headers["x-onepipe-signature"] as string;
    const isValid = verifySignature(req.body, signature);

    if (!isValid) {
      console.error("❌ Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Extract webhook data
    const {
      event_type,
      mandate_id,
      transaction_reference,
      amount,
      installment_number,
      status,
    } = req.body;

    console.log(`✅ Processing ${event_type} for mandate ${mandate_id}`);

    // TODO: Process payment (will implement with database)
    // For now, just log and return success

    return res.status(200).json({
      message: "Webhook processed successfully",
      transaction_reference,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Verify webhook signature
function verifySignature(payload: any, signature: string): boolean {
  if (!signature) {
    console.warn(
      "⚠️  No signature provided (skipping verification for testing)",
    );
    return true; // Skip verification for initial testing
  }

  const secret = process.env.ONEPIPE_WEBHOOK_SECRET || "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return hash === signature;
}

export default router;
```

### File: `.env`

```env
# Server
PORT=3000
NODE_ENV=development

# OnePipe
ONEPIPE_API_KEY=your_api_key_here
ONEPIPE_API_SECRET=your_api_secret_here
ONEPIPE_BASE_URL=https://api.paywithaccount.com/v1
ONEPIPE_WEBHOOK_SECRET=your_webhook_secret_here

# Database (will add later)
# DATABASE_URL=postgresql://user:password@localhost:5432/easy_shopping
```

### File: `package.json` (update scripts)

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## Step 3: Test Locally (5 minutes)

```bash
# Start the server
npm run dev

# You should see:
# 🚀 Server running on port 3000
# 📍 Webhook endpoint: http://localhost:3000/webhooks/onepipe
```

### Test the webhook with curl:

```bash
curl -X POST http://localhost:3000/webhooks/onepipe \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "payment.success",
    "mandate_id": "OPM_TEST123",
    "transaction_reference": "TXN_TEST456",
    "amount": 30000,
    "installment_number": 1,
    "payment_date": "2026-01-21T12:00:00Z",
    "status": "success"
  }'
```

You should see:

```json
{
  "message": "Webhook processed successfully",
  "transaction_reference": "TXN_TEST456"
}
```

---

## Step 4: Deploy to Railway (10 minutes)

### Option A: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to new project
railway link

# Add environment variables
railway variables set ONEPIPE_API_KEY=your_key
railway variables set ONEPIPE_API_SECRET=your_secret
railway variables set ONEPIPE_WEBHOOK_SECRET=your_webhook_secret

# Deploy
railway up
```

### Option B: Deploy via GitHub

1. Push code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit: webhook endpoint"
git remote add origin https://github.com/yourusername/easy-shopping.git
git push -u origin main
```

2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add environment variables in Railway dashboard
6. Deploy!

### Get Your Webhook URL

After deployment, Railway will give you a URL like:

```
https://your-app.railway.app
```

Your webhook endpoint will be:

```
https://your-app.railway.app/webhooks/onepipe
```

---

## Step 5: Configure OnePipe (5 minutes)

1. Login to OnePipe dashboard: https://dashboard.paywithaccount.com
2. Go to **Settings** → **Webhooks**
3. Add webhook URL: `https://your-app.railway.app/webhooks/onepipe`
4. Copy the webhook secret
5. Update your Railway environment variable: `ONEPIPE_WEBHOOK_SECRET`

---

## Step 6: Test End-to-End (5 minutes)

### Test with OnePipe Sandbox

1. Create a test mandate in OnePipe dashboard
2. Trigger a test payment
3. Check your Railway logs to see webhook received
4. Verify webhook processed successfully

### View Logs

```bash
# If using Railway CLI
railway logs

# Or view in Railway dashboard
```

---

## What's Next?

Now that your webhook is deployed and working, you can proceed with:

### Phase 2: Database Setup

- [ ] Create PostgreSQL database (Supabase recommended)
- [ ] Run database migrations
- [ ] Create Sequelize models
- [ ] Connect webhook to database

### Phase 3: OnePipe Integration

- [ ] Implement `send_invoice` (create mandate)
- [ ] Implement `lookup_bvn_min` (verify accounts)
- [ ] Complete webhook payment processing

### Phase 4: Frontend

- [ ] Initialize React app
- [ ] Create authentication pages
- [ ] Build checkout flow
- [ ] Integrate with backend

---

## Troubleshooting

### Issue: "Cannot find module 'express'"

**Solution:** Run `npm install` to install dependencies

### Issue: "Port 3000 already in use"

**Solution:** Change PORT in `.env` or kill the process using port 3000

### Issue: "Webhook not receiving events"

**Solution:**

- Check Railway logs for errors
- Verify webhook URL in OnePipe dashboard
- Test with curl first

### Issue: "Invalid signature"

**Solution:**

- Verify `ONEPIPE_WEBHOOK_SECRET` is correct
- Check OnePipe dashboard for correct secret

---

## Useful Commands

```bash
# Start development server
npm run dev

# View Railway logs
railway logs

# Test webhook locally
curl -X POST http://localhost:3000/webhooks/onepipe \
  -H "Content-Type: application/json" \
  -d '{"event_type":"payment.success","mandate_id":"TEST"}'

# Deploy to Railway
railway up

# Check health endpoint
curl https://your-app.railway.app/health
```

---

## Resources

- **OnePipe Docs:** https://docs.paywithaccount.com/
- **Railway Docs:** https://docs.railway.app/
- **Express Docs:** https://expressjs.com/
- **Sequelize Docs:** https://sequelize.org/

---

## Need Help?

Refer to:

- `IMPLEMENTATION_PLAN.md` - Full implementation guide
- `WEBHOOK_FLOW.md` - Detailed webhook integration
- `prd.md` - Product requirements

---

**You're all set!** 🎉

Your webhook endpoint is now live and ready to receive payment notifications from OnePipe. Continue with the implementation plan to build out the rest of the platform.
