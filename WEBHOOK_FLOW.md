# OnePipe Webhook Integration Guide

## Quick Reference for Payment & Reconciliation Flow

---

## Overview

The webhook is the **heart** of the payment reconciliation system. OnePipe sends payment notifications to your webhook endpoint whenever:

- A customer makes a payment
- A payment fails
- A mandate status changes

---

## Webhook Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. Customer Checkout
   ↓
2. Backend calls OnePipe send_invoice
   ↓
3. OnePipe returns virtual account
   ↓
4. Customer transfers money to virtual account
   ↓
5. OnePipe detects payment
   ↓
6. OnePipe sends webhook to your endpoint ⚡
   ↓
7. Your webhook handler processes payment
   ↓
8. Update order status in database
   ↓
9. Notify customer & vendor
   ↓
10. Done! ✅
```

---

## Webhook Endpoint Implementation

### 1. Endpoint URL

```
POST https://your-app.railway.app/webhooks/onepipe
```

### 2. Expected Payload from OnePipe

```json
{
  "event_type": "payment.success",
  "mandate_id": "OPM_1234567890",
  "transaction_reference": "TXN_0987654321",
  "amount": 30000.0,
  "installment_number": 1,
  "payment_date": "2026-01-21T12:00:00Z",
  "customer_account": "0123456789",
  "bank_code": "044",
  "status": "success",
  "metadata": {
    "order_id": "uuid-here"
  },
  "signature": "sha256_hash_here"
}
```

### 3. Webhook Handler Code (Node.js/Express)

```javascript
// src/routes/webhooks.ts

import express from 'express';
import crypto from 'crypto';
import { Mandate, Order, PaymentAttempt } from '../models';
import { notifyCustomer, notifyVendor } from '../services/notifications';

const router = express.Router();

// Webhook endpoint
router.post('/onepipe', async (req, res) => {
  try {
    // STEP 1: Verify webhook signature
    const signature = req.headers['x-onepipe-signature'];
    const isValid = verifyWebhookSignature(req.body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // STEP 2: Extract webhook data
    const {
      event_type,
      mandate_id,
      transaction_reference,
      amount,
      installment_number,
      payment_date,
      status,
      metadata
    } = req.body;

    // STEP 3: Find mandate in database
    const mandate = await Mandate.findOne({
      where: { onepipe_mandate_id: mandate_id }
    });

    if (!mandate) {
      console.error(`Mandate not found: ${mandate_id}`);
      return res.status(404).json({ error: 'Mandate not found' });
    }

    // STEP 4: Check for duplicate webhook (idempotency)
    const existingAttempt = await PaymentAttempt.findOne({
      where: {
        mandate_id: mandate.id,
        transaction_reference: transaction_reference
      }
    });

    if (existingAttempt) {
      console.log(`Duplicate webhook ignored: ${transaction_reference}`);
      return res.status(200).json({ message: 'Already processed' });
    }

    // STEP 5: Log payment attempt
    await PaymentAttempt.create({
      mandate_id: mandate.id,
      installment_number,
      amount,
      status,
      transaction_reference,
      webhook_data: req.body,
      attempted_at: new Date(payment_date)
    });

    // STEP 6: Process payment based on status
    if (status === 'success') {
      await handleSuccessfulPayment(mandate, amount, installment_number);
    } else if (status === 'failed') {
      await handleFailedPayment(mandate, installment_number);
    }

    // STEP 7: Return success response to OnePipe
    return res.status(200).json({
      message: 'Webhook processed successfully',
      transaction_reference
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify webhook signature
function verifyWebhookSignature(payload: any, signature: string): boolean {
  const secret = process.env.ONEPIPE_WEBHOOK_SECRET;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}

// Handle successful payment
async function handleSuccessfulPayment(
  mandate: any,
  amount: number,
  installmentNumber: number
) {
  // Update mandate
  mandate.installments_paid += 1;
  await mandate.save();

  // Update order
  const order = await Order.findByPk(mandate.order_id);
  order.installments_paid += 1;
  order.amount_paid += amount;

  // Check if order is completed
  if (order.installments_paid === order.installments) {
    order.status = 'completed';
  } else if (order.installments_paid === 1) {
    order.status = 'active'; // First payment received
  }

  await order.save();

  // Send notifications
  await notifyCustomer(order, {
    type: 'payment_success',
    installment: installmentNumber,
    amount: amount,
    remaining: order.installments - order.installments_paid
  });

  await notifyVendor(order, {
    type: 'payment_received',
    installment: installmentNumber,
    amount: amount
  });

  console.log(`Payment processed: Order ${order.id}, Installment ${installmentNumber}`);
}

// Handle failed payment
async function handleFailedPayment(mandate: any, installmentNumber: number) {
  const order = await Order.findByPk(mandate.order_id);

  // Mark mandate as failed
  mandate.status = 'failed';
  await mandate.save();

  // Try backup account if available
  const customer = await order.getCustomer();
  const backupAccounts = await customer.getAccounts({
    where: {
      priority: { [Op.gt]: mandate.account_priority },
      verified: true
    },
    order: [['priority', 'ASC']],
    limit: 1
  });

  if (backupAccounts.length > 0) {
    // Create new mandate with backup account
    const backupAccount = backupAccounts[0];
    await createReplacementMandate(order, mandate, backupAccount);

    // Notify customer about account switch
    await notifyCustomer(order, {
      type: 'payment_failed_retry',
      old_account: mandate.account_number,
      new_account: backupAccount.account_number
    });
  } else {
    // No backup accounts available
    order.status = 'payment_failed';
    await order.save();

    // Notify customer to update payment method
    await notifyCustomer(order, {
      type: 'payment_failed_no_backup',
      installment: installmentNumber
    });
  }

  console.log(`Payment failed: Order ${order.id}, Installment ${installmentNumber}`);
}

export default router;
```

---

## Webhook Security Checklist

✅ **Signature Verification**

- Always verify `x-onepipe-signature` header
- Use HMAC SHA256 with your webhook secret
- Reject requests with invalid signatures

✅ **Idempotency**

- Check for duplicate `transaction_reference`
- Don't process the same payment twice
- Return 200 OK for duplicates

✅ **HTTPS Only**

- Webhook endpoint must use HTTPS
- OnePipe will reject HTTP endpoints

✅ **Rate Limiting**

- Implement rate limiting on webhook endpoint
- Prevent abuse/DDoS attacks

✅ **Error Handling**

- Always return 200 OK if processed successfully
- Return 500 for server errors (OnePipe will retry)
- Log all webhook events for debugging

---

## Testing the Webhook

### 1. Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your backend locally
npm run dev

# Expose local server
ngrok http 3000

# Use ngrok URL in OnePipe dashboard
# Example: https://abc123.ngrok.io/webhooks/onepipe
```

### 2. Manual Webhook Simulation

```bash
# Use curl to simulate OnePipe webhook
curl -X POST http://localhost:3000/webhooks/onepipe \
  -H "Content-Type: application/json" \
  -H "x-onepipe-signature: your_test_signature" \
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

### 3. OnePipe Test Environment

- Use OnePipe sandbox/test environment
- Create test mandates
- Trigger test payments
- Verify webhook receives notifications

---

## Webhook Event Types

| Event Type           | Description                    | Action Required                       |
| -------------------- | ------------------------------ | ------------------------------------- |
| `payment.success`    | Payment completed successfully | Update order, notify users            |
| `payment.failed`     | Payment attempt failed         | Try backup account or notify customer |
| `mandate.authorized` | Customer authorized mandate    | Update mandate status                 |
| `mandate.cancelled`  | Customer cancelled mandate     | Mark order as cancelled               |
| `refund.processed`   | Refund completed               | Update order, credit customer         |

---

## Database Updates on Webhook

### 1. Payment Attempts Table

```sql
INSERT INTO payment_attempts (
  mandate_id,
  installment_number,
  amount,
  status,
  transaction_reference,
  webhook_data,
  attempted_at
) VALUES (...);
```

### 2. Mandates Table

```sql
UPDATE mandates
SET installments_paid = installments_paid + 1
WHERE id = ?;
```

### 3. Orders Table

```sql
UPDATE orders
SET
  installments_paid = installments_paid + 1,
  amount_paid = amount_paid + ?,
  status = CASE
    WHEN installments_paid = installments THEN 'completed'
    ELSE 'active'
  END
WHERE id = ?;
```

---

## Monitoring & Debugging

### 1. Webhook Logs Dashboard

Create an admin page to view webhook logs:

```javascript
GET /api/admin/webhook-logs

Response:
{
  "logs": [
    {
      "id": "uuid",
      "event_type": "payment.success",
      "mandate_id": "OPM_123",
      "status": "processed",
      "received_at": "2026-01-21T12:00:00Z",
      "processed_at": "2026-01-21T12:00:01Z",
      "error": null
    }
  ],
  "stats": {
    "total": 150,
    "success": 145,
    "failed": 5,
    "success_rate": 96.67
  }
}
```

### 2. Error Tracking

Integrate error tracking service:

- Sentry
- LogRocket
- Rollbar

### 3. Webhook Health Check

```javascript
GET /webhooks/health

Response:
{
  "status": "healthy",
  "last_webhook_received": "2026-01-21T12:00:00Z",
  "webhooks_processed_today": 45,
  "error_rate": 0.02
}
```

---

## Common Issues & Solutions

### Issue 1: Webhook Not Receiving Events

**Causes:**

- Incorrect URL in OnePipe dashboard
- Firewall blocking OnePipe IPs
- Server down

**Solutions:**

- Verify URL is correct and accessible
- Check server logs
- Test with curl/Postman

### Issue 2: Duplicate Webhooks

**Causes:**

- OnePipe retry mechanism
- Network issues

**Solutions:**

- Implement idempotency check
- Use `transaction_reference` as unique key

### Issue 3: Signature Verification Fails

**Causes:**

- Wrong webhook secret
- Payload modification

**Solutions:**

- Verify `ONEPIPE_WEBHOOK_SECRET` in .env
- Don't modify request body before verification

---

## Deployment Checklist

Before going live:

- [ ] Webhook endpoint deployed to production
- [ ] HTTPS enabled (SSL certificate)
- [ ] Webhook URL configured in OnePipe dashboard
- [ ] Environment variables set correctly
- [ ] Signature verification working
- [ ] Database migrations run
- [ ] Error tracking enabled
- [ ] Monitoring dashboard setup
- [ ] Test webhook with OnePipe sandbox
- [ ] Backup account fallback tested
- [ ] Notification system working

---

## Next Steps

1. **Implement webhook endpoint** (use code above)
2. **Deploy to Railway/Render**
3. **Get public HTTPS URL**
4. **Configure in OnePipe dashboard**
5. **Test with sandbox environment**
6. **Monitor webhook logs**
7. **Go live!** 🚀

---

**Questions?** Refer to OnePipe documentation: https://docs.paywithaccount.com/
