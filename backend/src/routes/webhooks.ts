import { Router, Request, Response } from "express";
import crypto from "crypto";
import Mandate from "../models/Mandate";
import Order from "../models/Order";
import PaymentAttempt from "../models/PaymentAttempt";
import CustomerAccount from "../models/CustomerAccount";
import { Op } from "sequelize";

const router = Router();

/**
 * Verify webhook signature from OnePipe
 */
function verifyWebhookSignature(
  payload: any,
  signature: string | undefined,
): boolean {
  if (!signature) {
    return false;
  }

  const secret = process.env.ONEPIPE_WEBHOOK_SECRET || "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return hash === signature;
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(
  mandate: any,
  amount: number,
  installmentNumber: number,
  _transactionRef: string,
): Promise<void> {
  // Update mandate
  mandate.installments_paid += 1;
  if (mandate.installments_paid >= mandate.total_installments) {
    mandate.status = "completed";
  } else if (mandate.status === "pending_auth") {
    mandate.status = "active";
  }
  await mandate.save();

  // Update order
  const order = await Order.findByPk(mandate.order_id);
  if (!order) {
    throw new Error(`Order not found for mandate ${mandate.id}`);
  }

  order.installments_paid += 1;
  order.amount_paid = parseFloat(order.amount_paid.toString()) + amount;

  // Update order status
  if (order.installments_paid >= (order.installments || 1)) {
    order.status = "completed";
  } else if (order.installments_paid === 1) {
    order.status = "active"; // First payment received
  }

  await order.save();

  console.log(
    `✅ Payment processed successfully: Order ${order.id}, Installment ${installmentNumber}`,
  );

  // TODO: Send notifications to customer and vendor
  // await notifyCustomer(order, { type: 'payment_success', installment: installmentNumber, amount });
  // await notifyVendor(order, { type: 'payment_received', installment: installmentNumber, amount });
}

/**
 * Handle failed payment - try backup account
 */
async function handleFailedPayment(
  mandate: any,
  installmentNumber: number,
  _failureReason: string,
): Promise<void> {
  console.log(
    `❌ Payment failed: Mandate ${mandate.id}, Installment ${installmentNumber}`,
  );

  const order = await Order.findByPk(mandate.order_id);
  if (!order) {
    throw new Error(`Order not found for mandate ${mandate.id}`);
  }

  // Mark current mandate as failed
  mandate.status = "failed";
  await mandate.save();

  // Get customer account to find backup accounts
  const currentAccount = await CustomerAccount.findByPk(
    mandate.customer_account_id,
  );
  if (!currentAccount) {
    throw new Error(
      `Customer account not found: ${mandate.customer_account_id}`,
    );
  }

  // Find backup accounts with higher priority
  const backupAccounts = await CustomerAccount.findAll({
    where: {
      customer_id: currentAccount.customer_id,
      priority: { [Op.gt]: currentAccount.priority },
      verified: true,
    },
    order: [["priority", "ASC"]],
    limit: 1,
  });

  if (backupAccounts.length > 0) {
    console.log(`🔄 Attempting backup account for order ${order.id}`);

    // TODO: Create new mandate with backup account
    // This would call OnePipe sendInvoice again with the backup account
    // For now, just log the intention

    console.log(`Backup account found: ${backupAccounts[0].account_number}`);

    // TODO: Notify customer about account switch
  } else {
    // No backup accounts available
    order.status = "failed";
    await order.save();

    console.log(`⚠️ No backup accounts available for order ${order.id}`);

    // TODO: Notify customer to update payment method
  }
}

/**
 * OnePipe Webhook Endpoint
 * POST /webhooks/onepipe
 */
router.post("/onepipe", async (req: Request, res: Response) => {
  try {
    console.log("📥 Webhook received:", JSON.stringify(req.body, null, 2));

    // STEP 1: Verify webhook signature
    const signature = req.headers["x-onepipe-signature"] as string;
    const isValid = verifyWebhookSignature(req.body, signature);

    if (!isValid) {
      console.error("❌ Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
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
      failure_reason,
      // _metadata,
    } = req.body;

    // STEP 3: Find mandate in database
    const mandate = await Mandate.findOne({
      where: { onepipe_mandate_id: mandate_id },
    });

    if (!mandate) {
      console.error(`❌ Mandate not found: ${mandate_id}`);
      return res.status(404).json({ error: "Mandate not found" });
    }

    // STEP 4: Check for duplicate webhook (idempotency)
    const existingAttempt = await PaymentAttempt.findOne({
      where: { transaction_reference },
    });

    if (existingAttempt) {
      console.log(`⚠️ Duplicate webhook ignored: ${transaction_reference}`);
      return res.status(200).json({ message: "Already processed" });
    }

    // STEP 5: Log payment attempt
    await PaymentAttempt.create({
      mandate_id: mandate.id,
      installment_number: installment_number || 1,
      amount: amount || 0,
      status: status === "success" ? "success" : "failed",
      failure_reason: failure_reason || null,
      transaction_reference,
      webhook_data: req.body,
      attempted_at: payment_date ? new Date(payment_date) : new Date(),
    });

    // STEP 6: Process payment based on status
    if (status === "success") {
      await handleSuccessfulPayment(
        mandate,
        parseFloat(amount),
        installment_number || 1,
        transaction_reference,
      );
    } else if (status === "failed") {
      await handleFailedPayment(
        mandate,
        installment_number || 1,
        failure_reason || "Unknown error",
      );
    }

    // STEP 7: Return success response to OnePipe
    return res.status(200).json({
      message: "Webhook processed successfully",
      transaction_reference,
      event_type,
    });
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * Health check endpoint for webhook
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const webhooksToday = await PaymentAttempt.count({
      where: {
        attempted_at: { [Op.gte]: today },
      },
    });

    const lastWebhook = await PaymentAttempt.findOne({
      order: [["attempted_at", "DESC"]],
    });

    return res.status(200).json({
      status: "healthy",
      last_webhook_received: lastWebhook?.attempted_at || null,
      webhooks_processed_today: webhooksToday,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

export default router;
