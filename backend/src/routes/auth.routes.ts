import { Router, Request, Response } from "express";
import authService from "../services/auth.service";
import { authenticate, validateBody } from "../middleware/auth.middleware";

const router = Router();

/**
 * Register customer
 * POST /api/auth/register/customer
 */
router.post(
  "/register/customer",
  validateBody(["email", "password", "firstName", "lastName", "phone", "bvn"]),
  async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, phone, bvn } = req.body;

      const result = await authService.registerCustomer({
        email,
        password,
        firstName,
        lastName,
        phone,
        bvn,
      });

      res.status(201).json({
        message: "Customer registered successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Customer registration error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

/**
 * Register vendor
 * POST /api/auth/register/vendor
 */
router.post(
  "/register/vendor",
  validateBody([
    "email",
    "password",
    "businessName",
    "businessCategory",
    "settlementAccountNumber",
    "settlementBankCode",
  ]),
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
        businessName,
        businessCategory,
        settlementAccountNumber,
        settlementBankCode,
      } = req.body;

      const result = await authService.registerVendor({
        email,
        password,
        businessName,
        businessCategory,
        settlementAccountNumber,
        settlementBankCode,
      });

      res.status(201).json({
        message: "Vendor registered successfully. Awaiting admin approval.",
        ...result,
      });
    } catch (error: any) {
      console.error("Vendor registration error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

/**
 * Login
 * POST /api/auth/login
 */
router.post(
  "/login",
  validateBody(["email", "password"]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password });

      res.status(200).json({
        message: "Login successful",
        ...result,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(401).json({ error: error.message });
    }
  },
);

/**
 * Get current user
 * GET /api/auth/me
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const result = await authService.getUserById(userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * Logout (client-side token removal)
 * POST /api/auth/logout
 */
router.post("/logout", authenticate, (_req: Request, res: Response) => {
  // JWT is stateless, so logout is handled client-side by removing the token
  res.status(200).json({ message: "Logout successful" });
});

export default router;
