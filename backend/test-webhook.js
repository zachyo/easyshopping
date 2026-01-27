#!/usr/bin/env node

/**
 * Test script for OnePipe webhook
 * Usage: node test-webhook.js
 */

const axios = require("axios");

const WEBHOOK_URL =
  process.env.WEBHOOK_URL || "http://localhost:3000/webhooks/onepipe";

// Test webhook payload (simulating OnePipe)
const testPayload = {
  event_type: "payment.success",
  mandate_id: "OPM_TEST_" + Date.now(),
  transaction_reference: "TXN_TEST_" + Date.now(),
  amount: 30000,
  installment_number: 1,
  payment_date: new Date().toISOString(),
  customer_account: "0123456789",
  bank_code: "044",
  status: "success",
  metadata: {
    order_id: "test-order-id",
  },
};

async function testWebhook() {
  console.log("🧪 Testing webhook endpoint...\n");
  console.log("URL:", WEBHOOK_URL);
  console.log("Payload:", JSON.stringify(testPayload, null, 2));
  console.log("\n---\n");

  try {
    const response = await axios.post(WEBHOOK_URL, testPayload, {
      headers: {
        "Content-Type": "application/json",
        "x-onepipe-signature": "test_signature_for_development",
      },
    });

    console.log("✅ Webhook test successful!");
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Webhook test failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

// Test health endpoint first
async function testHealth() {
  const healthUrl = WEBHOOK_URL.replace("/webhooks/onepipe", "/health");
  console.log("🏥 Testing health endpoint...\n");
  console.log("URL:", healthUrl);

  try {
    const response = await axios.get(healthUrl);
    console.log("✅ Health check successful!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
    console.log("\n---\n");
  } catch (error) {
    console.error("❌ Health check failed!");
    console.error("Make sure the server is running: npm run dev");
    process.exit(1);
  }
}

// Run tests
(async () => {
  await testHealth();
  await testWebhook();
})();
