import { Router, Request, Response } from "express";
import CustomerAccount from "../models/CustomerAccount";
import Customer from "../models/Customer";
import onepipeService from "../services/onepipe.service";
import {
  authenticate,
  authorize,
  validateBody,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * Get all accounts for a customer
 * GET /api/customers/:customerId/accounts
 */
router.get(
  "/:customerId/accounts",
  authenticate,
  authorize("customer", "admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId } = req.params;
      const userId = (req as any).user.userId;

      // Verify customer belongs to user (unless admin)
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      if ((req as any).user.role !== "admin" && customer.user_id !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Get all accounts
      const accounts = await CustomerAccount.findAll({
        where: { customer_id: customerId },
        order: [["priority", "ASC"]],
      });

      res.status(200).json({
        accounts: accounts.map((acc) => ({
          id: acc.id,
          // Mask account number: show only last 4 digits
          accountNumberMasked: `****${acc.account_number.slice(-4)}`,
          bankCode: acc.bank_code,
          bankName: acc.bank_name,
          accountName: acc.account_name,
          priority: acc.priority,
          verified: acc.verified,
          bvnVerifiedAt: acc.bvn_verified_at,
          createdAt: acc.created_at,
        })),
      });
    } catch (error: any) {
      console.error("Get accounts error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Add new bank account with BVN verification
 * POST /api/customers/:customerId/accounts
 */
router.post(
  "/:customerId/accounts",
  authenticate,
  authorize("customer", "admin"),
  validateBody(["accountNumber", "bankCode", "bankName", "bvn"]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId } = req.params;
      const { accountNumber, bankCode, bankName, bvn } = req.body;
      const userId = (req as any).user.userId;

      // Verify customer belongs to user
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      if ((req as any).user.role !== "admin" && customer.user_id !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Check if account already exists for ANY customer
      const existingAccount = await CustomerAccount.findOne({
        where: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      });

      if (existingAccount) {
        // If it belongs to CURRENT customer
        if (existingAccount.customer_id === customerId) {
          res
            .status(400)
            .json({ error: "Account already linked to your profile" });
          return;
        }
        // If it belongs to ANOTHER customer
        res.status(400).json({
          error:
            "This account is already linked to another Easy Shopping user.",
        });
        return;
      }

      // Check max accounts limit
      const accountCount = await CustomerAccount.count({
        where: { customer_id: customerId },
      });

      const maxAccounts = parseInt(process.env.MAX_BACKUP_ACCOUNTS || "3");
      if (accountCount >= maxAccounts) {
        res.status(400).json({
          error: `Maximum ${maxAccounts} accounts allowed`,
        });
        return;
      }

      console.log("🔍 Verifying BVN with OnePipe...");

      // Verify BVN with OnePipe
      let bvnVerified = false;
      let accountName = "Unknown";

      try {
        const bvnResponse = await onepipeService.lookupBvnMin({
          bvn: bvn,
          accountNumber,
          bankCode,
        });

        console.log("BVN Verification Response:", bvnResponse);

        // Check if verification was successful
        if (bvnResponse.bvn_linked === true) {
          bvnVerified = true;
          accountName = bvnResponse.account_name;
        } else {
          res.status(400).json({
            error: "BVN doesn't match this account. Please check your details.",
          });
          return;
        }
      } catch (error: any) {
        console.error("BVN verification failed:", error.message);
        // In development/mock mode, allow account creation even if verification fails
        if (process.env.ONEPIPE_MOCK_MODE === "true") {
          console.log(
            "⚠️ Mock mode: Allowing account creation despite verification failure",
          );
          bvnVerified = true;
          accountName = `${customer.first_name} ${customer.last_name}`;
        } else {
          throw new Error("BVN verification failed: " + error.message);
        }
      }

      // Determine priority (1 for first account, increment for others)
      const priority = accountCount + 1;

      // Create account
      const account = await CustomerAccount.create({
        customer_id: customerId,
        account_number: accountNumber,
        bank_code: bankCode,
        bank_name: bankName,
        account_name: accountName,
        priority,
        verified: bvnVerified,
        bvn_verified_at: bvnVerified ? new Date() : null,
      });

      res.status(201).json({
        message: "Account added successfully",
        account: {
          id: account.id,
          accountNumber: account.account_number,
          bankCode: account.bank_code,
          bankName: account.bank_name,
          accountName: account.account_name,
          priority: account.priority,
          verified: account.verified,
          bvnVerifiedAt: account.bvn_verified_at,
        },
      });
    } catch (error: any) {
      console.error("Add account error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

/**
 * Update account priority
 * PUT /api/customers/:customerId/accounts/:accountId
 */
router.put(
  "/:customerId/accounts/:accountId",
  authenticate,
  authorize("customer", "admin"),
  validateBody(["priority"]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId, accountId } = req.params;
      const { priority } = req.body;
      const userId = (req as any).user.userId;

      // Verify customer belongs to user
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      if ((req as any).user.role !== "admin" && customer.user_id !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Find account
      const account = await CustomerAccount.findOne({
        where: {
          id: accountId,
          customer_id: customerId,
        },
      });

      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      // Update priority
      account.priority = priority;
      await account.save();

      res.status(200).json({
        message: "Account priority updated",
        account: {
          id: account.id,
          priority: account.priority,
        },
      });
    } catch (error: any) {
      console.error("Update account error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

/**
 * Delete account
 * DELETE /api/customers/:customerId/accounts/:accountId
 */
router.delete(
  "/:customerId/accounts/:accountId",
  authenticate,
  authorize("customer", "admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId, accountId } = req.params;
      const userId = (req as any).user.userId;

      // Verify customer belongs to user
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      if ((req as any).user.role !== "admin" && customer.user_id !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Find account
      const account = await CustomerAccount.findOne({
        where: {
          id: accountId,
          customer_id: customerId,
        },
      });

      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      // TODO: Check if account is used in active mandates
      // For now, just delete
      await account.destroy();

      res.status(200).json({
        message: "Account deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

export default router;
