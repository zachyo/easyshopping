import { Router, Request, Response } from "express";
import Order from "../models/Order";
import Mandate from "../models/Mandate";
import Customer from "../models/Customer";
import CustomerAccount from "../models/CustomerAccount";
import Product from "../models/Product";
import onepipeService from "../services/onepipe.service";
import {
  authenticate,
  authorize,
  validateBody,
} from "../middleware/auth.middleware";
import sequelize from "../config/database";
import User from "../models/User";

const router = Router();

/**
 * Create new order with payment mandate
 * POST /api/orders
 */
router.post(
  "/",
  authenticate,
  authorize("customer"),
  validateBody(["items", "shippingAddress"]),
  async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();

    try {
      const { items, installments, accountId, shippingAddress } = req.body;
      const userId = (req as any).user.userId;

      // Get customer
      const customer = await Customer.findOne({ where: { user_id: userId } });
      const user = await User.findByPk(userId);
      const email = user?.email || "customer@example.com";
      if (!customer) {
        await transaction.rollback();
        res.status(404).json({ error: "Customer profile not found" });
        return;
      }

      // Check installments to determine payment type
      const numInstallments = installments
        ? parseInt(installments.toString())
        : 1;
      const isRecurring = numInstallments > 1;

      // Validate account belongs to customer IF recurring payment
      let account: any = null;
      if (isRecurring) {
        if (!accountId) {
          await transaction.rollback();
          res
            .status(400)
            .json({ error: "Account ID is required for installment payments" });
          return;
        }

        account = await CustomerAccount.findOne({
          where: {
            id: accountId,
            customer_id: customer.id,
          },
        });

        if (!account) {
          await transaction.rollback();
          res.status(404).json({
            error: "Account not found or does not belong to customer",
          });
          return;
        }

        if (!account.verified) {
          await transaction.rollback();
          res
            .status(400)
            .json({ error: "Account not verified. Please verify BVN first." });
          return;
        }
      }

      // Validate and calculate order total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          await transaction.rollback();
          res
            .status(404)
            .json({ error: `Product ${item.productId} not found` });
          return;
        }

        if (product.stock_quantity < item.quantity) {
          await transaction.rollback();
          res.status(400).json({
            error: `Insufficient stock for ${product.name}`,
          });
          return;
        }

        const itemTotal = parseFloat(product.price.toString()) * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          subtotal: itemTotal,
        });

        // Update stock
        product.stock_quantity -= item.quantity;
        if (product.stock_quantity === 0) {
          product.status = "out_of_stock";
        }
        await product.save({ transaction });
      }

      // Get vendor from first product (assuming single vendor per order for now)
      const firstProduct = await Product.findByPk(items[0].productId);
      const vendorId = firstProduct!.vendor_id;

      // Calculate installment details
      const amountPerInstallment = isRecurring
        ? totalAmount / numInstallments
        : null;

      // Create order
      const order = await Order.create(
        {
          customer_id: customer.id,
          vendor_id: vendorId,
          total_amount: totalAmount,
          installments: isRecurring ? numInstallments : null,
          amount_per_installment: amountPerInstallment,
          installments_paid: 0,
          amount_paid: 0,
          status: "pending",
          order_items: orderItems,
          shipping_address: shippingAddress,
        },
        { transaction },
      );

      // If installments, create OnePipe mandate
      let mandate = null;
      let virtualAccount = null;

      if (numInstallments && numInstallments > 1) {
        console.log("📝 Creating OnePipe mandate for order:", order.id);

        try {
          const mandateResponse = await onepipeService.sendInvoice({
            customerId: customer.id,
            customerName: `${customer.first_name} ${customer.last_name}`,
            customerEmail: email || "customer@example.com",
            accountNumber: account.account_number,
            bankCode: account.bank_code,
            amount: totalAmount,
            installments: numInstallments,
            orderId: order.id,
          });

          console.log("OnePipe mandate response:", mandateResponse);

          // Extract mandate details from response
          const onepipeMandateId =
            mandateResponse.data?.mandate_id ||
            mandateResponse.data?.reference ||
            `MANDATE_${order.id}`;

          virtualAccount =
            mandateResponse.data?.virtual_account ||
            mandateResponse.data?.account_number ||
            null;

          // Calculate dates
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + numInstallments);

          // Create mandate record
          mandate = await Mandate.create(
            {
              order_id: order.id,
              customer_account_id: account.id,
              onepipe_mandate_id: onepipeMandateId,
              virtual_account: virtualAccount,
              amount_per_installment: amountPerInstallment!,
              total_installments: numInstallments,
              installments_paid: 0,
              start_date: startDate,
              end_date: endDate,
              status: "pending_auth",
            },
            { transaction },
          );

          // Update order with mandate
          order.current_mandate_id = mandate.id;
          order.status = "authorized";
          await order.save({ transaction });
        } catch (error: any) {
          console.error("OnePipe mandate creation failed:", error);

          // In mock mode, create mandate anyway
          if (process.env.ONEPIPE_MOCK_MODE === "true") {
            console.log("⚠️ Mock mode: Creating mandate without OnePipe");

            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + numInstallments);

            mandate = await Mandate.create(
              {
                order_id: order.id,
                customer_account_id: account.id,
                onepipe_mandate_id: `MOCK_MANDATE_${order.id}`,
                virtual_account: "1234567890",
                amount_per_installment: amountPerInstallment!,
                total_installments: numInstallments,
                installments_paid: 0,
                start_date: startDate,
                end_date: endDate,
                status: "pending_auth",
              },
              { transaction },
            );

            order.current_mandate_id = mandate.id;
            order.status = "authorized";
            await order.save({ transaction });
          } else {
            await transaction.rollback();
            throw error;
          }
        }
      } else {
        // Full payment - single payment invoice
        console.log(
          "📝 Creating OnePipe invoice for single payment:",
          order.id,
        );

        try {
          await onepipeService.sendInvoice({
            customerId: customer.id,
            customerName: `${customer.first_name} ${customer.last_name}`,
            customerEmail: email,
            customerMobile: customer.phone,
            accountNumber: account?.account_number || "",
            bankCode: account?.bank_code || "",
            amount: totalAmount,
            installments: 1,
            orderId: order.id,
            paymentType: "single_payment",
          });

          order.status = "pending";
          await order.save({ transaction });
        } catch (error: any) {
          console.error("OnePipe single payment invoice failed:", error);

          if (process.env.ONEPIPE_MOCK_MODE === "true") {
            console.log(
              "⚠️ Mock mode: creating order without OnePipe single payment",
            );
            order.status = "pending";
            await order.save({ transaction });
          } else {
            await transaction.rollback();
            throw error;
          }
        }
      }

      await transaction.commit();

      res.status(201).json({
        message: "Order created successfully",
        order: {
          id: order.id,
          totalAmount: order.total_amount,
          installments: order.installments,
          amountPerInstallment: order.amount_per_installment,
          status: order.status,
          items: orderItems,
        },
        mandate: mandate
          ? {
              id: mandate.id,
              virtualAccount: mandate.virtual_account,
              amountPerInstallment: mandate.amount_per_installment,
              totalInstallments: mandate.total_installments,
              startDate: mandate.start_date,
              endDate: mandate.end_date,
              status: mandate.status,
            }
          : null,
        paymentInstructions: mandate
          ? {
              message:
                "Transfer the first installment to the virtual account below",
              virtualAccount: mandate.virtual_account,
              amount: mandate.amount_per_installment,
              bankName: account.bank_name,
            }
          : null,
      });
    } catch (error: any) {
      await transaction.rollback();
      console.error("Create order error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
router.get(
  "/:orderId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      const order = await Order.findByPk(orderId);
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Verify access
      if (userRole === "customer") {
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer || order.customer_id !== customer.id) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      } else if (userRole === "vendor") {
        // TODO: Verify vendor owns this order
      }

      // Get mandate if exists
      let mandate = null;
      if (order.current_mandate_id) {
        mandate = await Mandate.findByPk(order.current_mandate_id);
      }

      res.status(200).json({
        order: {
          id: order.id,
          totalAmount: order.total_amount,
          installments: order.installments,
          amountPerInstallment: order.amount_per_installment,
          installmentsPaid: order.installments_paid,
          amountPaid: order.amount_paid,
          status: order.status,
          items: order.order_items,
          shippingAddress: order.shipping_address,
          createdAt: order.created_at,
        },
        mandate: mandate
          ? {
              id: mandate.id,
              virtualAccount: mandate.virtual_account,
              amountPerInstallment: mandate.amount_per_installment,
              totalInstallments: mandate.total_installments,
              installmentsPaid: mandate.installments_paid,
              status: mandate.status,
              startDate: mandate.start_date,
              endDate: mandate.end_date,
            }
          : null,
      });
    } catch (error: any) {
      console.error("Get order error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Get all orders for current customer
 * GET /api/orders
 */
router.get(
  "/",
  authenticate,
  authorize("customer"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;

      const customer = await Customer.findOne({ where: { user_id: userId } });
      if (!customer) {
        res.status(404).json({ error: "Customer profile not found" });
        return;
      }

      const orders = await Order.findAll({
        where: { customer_id: customer.id },
        order: [["created_at", "DESC"]],
      });

      res.status(200).json({
        orders: orders.map((order) => ({
          id: order.id,
          totalAmount: order.total_amount,
          installments: order.installments,
          installmentsPaid: order.installments_paid,
          amountPaid: order.amount_paid,
          status: order.status,
          items: order.order_items,
          createdAt: order.created_at,
        })),
      });
    } catch (error: any) {
      console.error("Get orders error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
