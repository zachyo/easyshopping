# Payment & Reconciliation Flow - Visual Summary

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EASY SHOPPING PLATFORM                       │
│                    Payment & Reconciliation System                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   CUSTOMER   │         │   BACKEND    │         │   ONEPIPE    │
│  (Frontend)  │         │  (Node.js)   │         │     API      │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │  1. Browse & Checkout  │                        │
       │───────────────────────▶│                        │
       │                        │                        │
       │                        │  2. Create Mandate     │
       │                        │  (send_invoice)        │
       │                        │───────────────────────▶│
       │                        │                        │
       │                        │  3. Virtual Account    │
       │                        │◀───────────────────────│
       │  4. Payment Details    │                        │
       │◀───────────────────────│                        │
       │                        │                        │
       │  5. Transfer Money     │                        │
       │────────────────────────┼───────────────────────▶│
       │                        │                        │
       │                        │  6. Webhook: Payment   │
       │                        │◀───────────────────────│
       │                        │     Success            │
       │                        │                        │
       │  7. Order Confirmed    │                        │
       │◀───────────────────────│                        │
       │                        │                        │
```

---

## Payment Flow - Step by Step

### Phase 1: Order Creation

```
Customer Action:
┌─────────────────────────────────────────┐
│ 1. Add products to cart                 │
│ 2. Go to checkout                       │
│ 3. Select "4-month installment"         │
│ 4. Choose primary bank account          │
│ 5. Click "Authorize Payment"            │
└─────────────────────────────────────────┘
                    ↓
Backend Processing:
┌─────────────────────────────────────────┐
│ 1. Validate customer has verified       │
│    account                               │
│ 2. Calculate payment breakdown:         │
│    - Total: ₦120,000                    │
│    - Frequency: Weekly                  │
│    - Count: 3 weeks                     │
│    - Amount: ₦40,000 per week           │
│ 3. Create order record (status: pending)│
│ 4. Call OnePipe send_invoice API        │
│ 5. Store mandate in database            │
│ 6. Return virtual account to frontend   │
└─────────────────────────────────────────┘
                    ↓
OnePipe Response:
┌─────────────────────────────────────────┐
│ Virtual Account: 1234567890              │
│ Bank: Wema Bank                          │
│ Amount: ₦40,000 (first payment)         │
│ Frequency: Every 7 days                 │
│ Mandate ID: OPM_ABC123                   │
└─────────────────────────────────────────┘
```

### Phase 2: First Payment

```
Customer Action:
┌─────────────────────────────────────────┐
│ Transfer ₦30,000 to virtual account     │
│ From: Access Bank - ...6789             │
│ To: Wema Bank - 1234567890              │
└─────────────────────────────────────────┘
                    ↓
OnePipe Detection:
┌─────────────────────────────────────────┐
│ 1. Detects incoming transfer            │
│ 2. Matches to mandate OPM_ABC123        │
│ 3. Validates amount (₦30,000)           │
│ 4. Sends webhook to backend             │
└─────────────────────────────────────────┘
                    ↓
Webhook Processing:
┌─────────────────────────────────────────┐
│ POST /webhooks/onepipe                   │
│                                          │
│ Payload:                                 │
│ {                                        │
│   "event_type": "payment.success",       │
│   "mandate_id": "OPM_ABC123",            │
│   "amount": 30000,                       │
│   "installment_number": 1,               │
│   "status": "success"                    │
│ }                                        │
└─────────────────────────────────────────┘
                    ↓
Backend Updates:
┌─────────────────────────────────────────┐
│ 1. Log payment attempt ✅                │
│ 2. Update mandate:                       │
│    - paymentsMade: 0 → 1                │
│ 3. Update order:                         │
│    - paymentsMade: 0 → 1                │
│    - amount_paid: ₦0 → ₦40,000          │
│    - status: pending → active           │
│ 4. Notify customer: "Payment received"   │
│ 5. Notify vendor: "Ship product"         │
└─────────────────────────────────────────┘
```

### Phase 3: Subsequent Payments (Auto-debit)

```
OnePipe Auto-Debit:
┌─────────────────────────────────────────┐
│ Day 7 (weekly) or Day 30 (monthly):     │
│ Attempt to debit next payment           │
│ From: Access Bank - ...6789             │
│                                          │
│ If successful:                           │
│   → Send webhook: payment.success       │
│                                          │
│ If failed (insufficient funds):          │
│   → Send webhook: payment.failed        │
└─────────────────────────────────────────┘
                    ↓
Success Path:
┌─────────────────────────────────────────┐
│ Webhook → Backend → Update order        │
│ Payment 2/3 paid ✅                      │
└─────────────────────────────────────────┘
                    ↓
Failure Path:
┌─────────────────────────────────────────┐
│ Webhook → Backend → Try backup account  │
│                                          │
│ 1. Find backup account (priority 2)     │
│ 2. Create new mandate with backup        │
│ 3. Notify customer of account switch    │
│ 4. Retry payment                         │
└─────────────────────────────────────────┘
```

### Phase 4: Order Completion

```
Final Payment:
┌─────────────────────────────────────────┐
│ Payment 3/3 paid ✅ (or 1/1 for daily)  │
│                                          │
│ Backend updates:                         │
│ - order.paymentsMade = 3 (or 1)        │
│ - order.amount_paid = ₦120,000          │
│ - order.status = "completed"            │
│ - mandate.status = "completed"          │
│                                          │
│ Notifications:                           │
│ - Customer: "Order complete!"           │
│ - Vendor: "Settlement processing"       │
└─────────────────────────────────────────┘
```

---

## Database State Changes

### Initial State (Order Created)

```sql
-- orders table
{
  id: "uuid-1",
  customer_id: "customer-uuid",
  total_amount: 120000,
  installments: 4,
  amount_per_installment: 30000,
  installments_paid: 0,
  amount_paid: 0,
  status: "pending"
}

-- mandates table
{
  id: "mandate-uuid",
  order_id: "uuid-1",
  onepipe_mandate_id: "OPM_ABC123",
  total_installments: 4,
  installments_paid: 0,
  status: "pending_auth"
}
```

### After First Payment

```sql
-- orders table
{
  installments_paid: 1,  -- 0 → 1
  amount_paid: 30000,    -- 0 → 30000
  status: "active"       -- pending → active
}

-- mandates table
{
  installments_paid: 1,  -- 0 → 1
  status: "active"       -- pending_auth → active
}

-- payment_attempts table (new record)
{
  id: "attempt-uuid",
  mandate_id: "mandate-uuid",
  installment_number: 1,
  amount: 30000,
  status: "success",
  attempted_at: "2026-01-21T12:00:00Z"
}
```

### After Final Payment

```sql
-- orders table
{
  installments_paid: 4,    -- 3 → 4
  amount_paid: 120000,     -- 90000 → 120000
  status: "completed"      -- active → completed
}

-- mandates table
{
  installments_paid: 4,    -- 3 → 4
  status: "completed"      -- active → completed
}
```

---

## Reconciliation Dashboard

### Admin View

```
┌─────────────────────────────────────────────────────────────┐
│                  RECONCILIATION DASHBOARD                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Today's Summary                                          │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Total Orders │   Payments   │   Revenue    │            │
│  │     45       │      142     │  ₦4,260,000  │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│  📈 Payment Success Rate: 96.5%                              │
│  ┌────────────────────────────────────────────┐            │
│  │ ████████████████████████████████████░░░░   │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  🔔 Recent Webhook Events                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Time      │ Event           │ Mandate    │ Status    │  │
│  ├───────────┼─────────────────┼────────────┼───────────┤  │
│  │ 12:34 PM  │ payment.success │ OPM_123    │ ✅ Processed│  │
│  │ 12:30 PM  │ payment.failed  │ OPM_124    │ 🔄 Retrying│  │
│  │ 12:25 PM  │ payment.success │ OPM_125    │ ✅ Processed│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  💰 Settlement Breakdown                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Vendor          │ Gross Sales │ Fees (2%) │ Net      │  │
│  ├─────────────────┼─────────────┼───────────┼──────────┤  │
│  │ Electronics Hub │ ₦2,400,000  │ ₦48,000   │₦2,352,000│  │
│  │ Fashion Store   │ ₦1,860,000  │ ₦37,200   │₦1,822,800│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling & Edge Cases

### Case 1: Payment Failure → Backup Account

```
Primary Account (Priority 1):
Access Bank - ...6789 ❌ Insufficient funds

        ↓ Automatic Fallback

Backup Account (Priority 2):
GTBank - ...4321 ✅ Payment successful

Backend Actions:
1. Mark old mandate as "replaced"
2. Create new mandate with GTBank account
3. Retry payment
4. Notify customer: "Payment switched to backup account"
```

### Case 2: All Accounts Failed

```
Primary Account: ❌ Failed
Backup Account 1: ❌ Failed
Backup Account 2: ❌ Failed

Backend Actions:
1. Mark order status as "payment_failed"
2. Notify customer: "Please update payment method"
3. Send email with payment instructions
4. Pause order (don't ship product)
```

### Case 3: Duplicate Webhook

```
Webhook 1: transaction_reference = "TXN_123"
           ✅ Processed

Webhook 2: transaction_reference = "TXN_123"
           ⏭️  Skipped (duplicate)

Backend Logic:
if (paymentAttemptExists(transaction_reference)) {
  return 200 OK; // Already processed
}
```

---

## Key Metrics to Track

### Payment Metrics

- **Success Rate:** (Successful payments / Total attempts) × 100
- **Average Payment Time:** Time from order creation to first payment
- **Retry Rate:** Percentage of payments requiring backup account
- **Completion Rate:** Orders fully paid / Total orders

### Reconciliation Metrics

- **Daily Revenue:** Sum of all successful payments
- **Vendor Payouts:** Gross sales - platform fees
- **Outstanding Payments:** Orders with pending installments
- **Failed Payments:** Payments requiring manual intervention

### Webhook Metrics

- **Webhook Latency:** Time from payment to webhook received
- **Processing Time:** Time to process webhook
- **Error Rate:** Failed webhook processing / Total webhooks
- **Duplicate Rate:** Duplicate webhooks received

---

## Implementation Priority

### Week 1: Backend + Webhook ⚡ (CRITICAL)

```
Day 1-2: ✅ Backend setup + webhook endpoint
Day 3-4: ✅ OnePipe integration + database
Day 5:   ✅ Payment reconciliation logic
```

### Week 2: Frontend + Integration

```
Day 1-2: ✅ React setup + authentication
Day 3-4: ✅ Checkout flow + account linking
Day 5:   ✅ Order tracking + testing
```

### Week 3: Polish + Launch

```
Day 1-2: ✅ UI polish + bug fixes
Day 3:   ✅ Production deployment
```

---

## Success Criteria

### Technical

- ✅ Webhook endpoint deployed and accessible
- ✅ 100% webhook signature verification
- ✅ <1 second webhook processing time
- ✅ Zero duplicate payment processing
- ✅ Automatic backup account fallback working

### Business

- ✅ 5 products uploaded by 2 vendors
- ✅ 3 customers with verified accounts
- ✅ 2 complete order flows executed
- ✅ >95% payment success rate
- ✅ Accurate settlement calculations

---

## Next Steps

1. **Start with Quick Start Guide** (`QUICK_START.md`)
   - Get webhook deployed in 30 minutes
2. **Follow Implementation Plan** (`IMPLEMENTATION_PLAN.md`)
   - Complete backend features
   - Build frontend
3. **Reference Webhook Flow** (`WEBHOOK_FLOW.md`)
   - Detailed webhook integration
4. **Test Everything**
   - Use OnePipe sandbox
   - Execute UAT test cases
5. **Go Live!** 🚀

---

**Ready to build?** Start with `QUICK_START.md` to get your webhook endpoint deployed! 🎯
