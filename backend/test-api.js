#!/usr/bin/env node

/**
 * Test script for Phase 2 API endpoints
 * Tests authentication, account linking, and order creation
 */

const axios = require("axios");

const BASE_URL = process.env.API_URL || "http://localhost:3000";

// Test data
let authToken = "";
let customerId = "";
let accountId = "";
let productId = "";
let orderId = "";

// Helper function
async function makeRequest(method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(data && { data }),
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

async function runTests() {
  console.log("🧪 Testing Phase 2 API Endpoints\n");
  console.log("================================\n");

  // Test 1: Health Check
  console.log("1️⃣  Testing Health Check...");
  const health = await makeRequest("GET", "/health");
  if (health.success) {
    console.log("✅ Health check passed");
    console.log("   Status:", health.data.status);
  } else {
    console.log("❌ Health check failed:", health.error);
    return;
  }
  console.log("");

  // Test 2: Register Customer
  console.log("2️⃣  Testing Customer Registration...");
  const registerData = {
    email: `test${Date.now()}@example.com`,
    password: "Test123!@#",
    firstName: "John",
    lastName: "Doe",
    phone: "+2348012345678",
    bvn: "12345678901",
  };

  const register = await makeRequest(
    "POST",
    "/api/auth/register/customer",
    registerData,
  );
  if (register.success) {
    console.log("✅ Customer registered successfully");
    authToken = register.data.token;
    customerId = register.data.customer.id;
    console.log("   Customer ID:", customerId);
    console.log("   Token:", authToken.substring(0, 20) + "...");
  } else {
    console.log("❌ Registration failed:", register.error);
    return;
  }
  console.log("");

  // Test 3: Login
  console.log("3️⃣  Testing Login...");
  const login = await makeRequest("POST", "/api/auth/login", {
    email: registerData.email,
    password: registerData.password,
  });

  if (login.success) {
    console.log("✅ Login successful");
    console.log("   Role:", login.data.user.role);
  } else {
    console.log("❌ Login failed:", login.error);
  }
  console.log("");

  // Test 4: Get Current User
  console.log("4️⃣  Testing Get Current User...");
  const me = await makeRequest("GET", "/api/auth/me", null, authToken);
  if (me.success) {
    console.log("✅ User info retrieved");
    console.log("   Email:", me.data.user.email);
    console.log(
      "   Name:",
      me.data.profile.firstName,
      me.data.profile.lastName,
    );
  } else {
    console.log("❌ Get user failed:", login.error);
  }
  console.log("");

  // Test 5: Add Bank Account (with BVN verification)
  console.log("5️⃣  Testing Add Bank Account (BVN Verification)...");
  const accountData = {
    accountNumber: "0123456789",
    bankCode: "044",
    bankName: "Access Bank",
  };

  const addAccount = await makeRequest(
    "POST",
    `/api/customers/${customerId}/accounts`,
    accountData,
    authToken,
  );

  if (addAccount.success) {
    console.log("✅ Account added successfully");
    accountId = addAccount.data.account.id;
    console.log("   Account ID:", accountId);
    console.log("   Account Name:", addAccount.data.account.accountName);
    console.log("   Verified:", addAccount.data.account.verified);
    console.log("   Priority:", addAccount.data.account.priority);
  } else {
    console.log(
      "⚠️  Account addition failed (expected in mock mode):",
      addAccount.error,
    );
    console.log("   This is normal if OnePipe credentials are not configured");
  }
  console.log("");

  // Test 6: Get All Accounts
  console.log("6️⃣  Testing Get All Accounts...");
  const accounts = await makeRequest(
    "GET",
    `/api/customers/${customerId}/accounts`,
    null,
    authToken,
  );

  if (accounts.success) {
    console.log("✅ Accounts retrieved");
    console.log("   Total accounts:", accounts.data.accounts.length);
  } else {
    console.log("❌ Get accounts failed:", accounts.error);
  }
  console.log("");

  // Test 7: Get Products
  console.log("7️⃣  Testing Get Products...");
  const products = await makeRequest("GET", "/api/products");
  if (products.success) {
    console.log("✅ Products retrieved");
    console.log("   Total products:", products.data.products.length);
    if (products.data.products.length > 0) {
      productId = products.data.products[0].id;
      console.log("   First product:", products.data.products[0].name);
    }
  } else {
    console.log("❌ Get products failed:", products.error);
  }
  console.log("");

  // Test 8: Create Order (if we have account and product)
  if (accountId && productId) {
    console.log("8️⃣  Testing Create Order with Installments...");
    const orderData = {
      items: [
        {
          productId: productId,
          quantity: 1,
        },
      ],
      installments: 4,
      accountId: accountId,
      shippingAddress: "123 Test Street, Lagos, Nigeria",
    };

    const createOrder = await makeRequest(
      "POST",
      "/api/orders",
      orderData,
      authToken,
    );

    if (createOrder.success) {
      console.log("✅ Order created successfully");
      orderId = createOrder.data.order.id;
      console.log("   Order ID:", orderId);
      console.log("   Total Amount:", createOrder.data.order.totalAmount);
      console.log("   Installments:", createOrder.data.order.installments);
      console.log(
        "   Amount per installment:",
        createOrder.data.order.amountPerInstallment,
      );

      if (createOrder.data.mandate) {
        console.log(
          "   Virtual Account:",
          createOrder.data.mandate.virtualAccount,
        );
        console.log("   Mandate Status:", createOrder.data.mandate.status);
      }
    } else {
      console.log("⚠️  Order creation failed:", createOrder.error);
    }
    console.log("");
  } else {
    console.log("8️⃣  Skipping order creation (no account or product)");
    console.log("");
  }

  // Test 9: Get Order
  if (orderId) {
    console.log("9️⃣  Testing Get Order...");
    const getOrder = await makeRequest(
      "GET",
      `/api/orders/${orderId}`,
      null,
      authToken,
    );

    if (getOrder.success) {
      console.log("✅ Order retrieved");
      console.log("   Status:", getOrder.data.order.status);
      console.log(
        "   Installments Paid:",
        getOrder.data.order.installmentsPaid,
      );
    } else {
      console.log("❌ Get order failed:", getOrder.error);
    }
    console.log("");
  }

  // Test 10: Get All Orders
  console.log("🔟 Testing Get All Orders...");
  const orders = await makeRequest("GET", "/api/orders", null, authToken);

  if (orders.success) {
    console.log("✅ Orders retrieved");
    console.log("   Total orders:", orders.data.orders.length);
  } else {
    console.log("❌ Get orders failed:", orders.error);
  }
  console.log("");

  console.log("================================");
  console.log("✅ Phase 2 API Tests Complete!");
  console.log("================================");
}

// Run tests
(async () => {
  try {
    await runTests();
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    process.exit(1);
  }
})();
