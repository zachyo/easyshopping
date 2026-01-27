import { Router, Request, Response } from "express";
import Product from "../models/Product";
import Vendor from "../models/Vendor";
import {
  authenticate,
  authorize,
  validateBody,
} from "../middleware/auth.middleware";
import { Op } from "sequelize";

const router = Router();

/**
 * Get all products (public)
 * GET /api/products
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      limit = 20,
      offset = 0,
    } = req.query;

    const where: any = {
      status: "active",
    };

    if (category) {
      where.category = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice as string);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice as string);
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const products = await Product.findAll({
      where,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      order: [["created_at", "DESC"]],
    });

    const total = await Product.count({ where });

    res.status(200).json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        stockQuantity: p.stock_quantity,
        images: p.images,
        status: p.status,
      })),
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error("Get products error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get product by ID
 * GET /api/products/:productId
 */
router.get(
  "/:productId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;

      const product = await Product.findByPk(productId);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.status(200).json({
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stockQuantity: product.stock_quantity,
          images: product.images,
          status: product.status,
          createdAt: product.created_at,
        },
      });
    } catch (error: any) {
      console.error("Get product error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Create product (vendor only)
 * POST /api/products
 */
router.post(
  "/",
  authenticate,
  authorize("vendor"),
  validateBody(["name", "description", "price", "category"]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, price, category, stockQuantity, images } =
        req.body;
      const userId = (req as any).user.userId;

      // Get vendor
      const vendor = await Vendor.findOne({ where: { user_id: userId } });
      if (!vendor) {
        res.status(404).json({ error: "Vendor profile not found" });
        return;
      }

      if (vendor.approval_status !== "approved") {
        res.status(403).json({ error: "Vendor not approved yet" });
        return;
      }

      // Create product
      const product = await Product.create({
        vendor_id: vendor.id,
        name,
        description,
        price,
        category,
        stock_quantity: stockQuantity || 0,
        images: images || [],
        status: stockQuantity > 0 ? "active" : "out_of_stock",
      });

      res.status(201).json({
        message: "Product created successfully",
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          stockQuantity: product.stock_quantity,
          status: product.status,
        },
      });
    } catch (error: any) {
      console.error("Create product error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

/**
 * Update product (vendor only)
 * PUT /api/products/:productId
 */
router.put(
  "/:productId",
  authenticate,
  authorize("vendor"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const {
        name,
        description,
        price,
        category,
        stockQuantity,
        images,
        status,
      } = req.body;
      const userId = (req as any).user.userId;

      // Get vendor
      const vendor = await Vendor.findOne({ where: { user_id: userId } });
      if (!vendor) {
        res.status(404).json({ error: "Vendor profile not found" });
        return;
      }

      // Get product
      const product = await Product.findByPk(productId);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      // Verify ownership
      if (product.vendor_id !== vendor.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Update fields
      if (name) product.name = name;
      if (description) product.description = description;
      if (price) product.price = price;
      if (category) product.category = category;
      if (stockQuantity !== undefined) {
        product.stock_quantity = stockQuantity;
        product.status = stockQuantity > 0 ? "active" : "out_of_stock";
      }
      if (images) product.images = images;
      if (status) product.status = status;

      await product.save();

      res.status(200).json({
        message: "Product updated successfully",
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          stockQuantity: product.stock_quantity,
          status: product.status,
        },
      });
    } catch (error: any) {
      console.error("Update product error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

/**
 * Delete product (vendor only)
 * DELETE /api/products/:productId
 */
router.delete(
  "/:productId",
  authenticate,
  authorize("vendor"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const userId = (req as any).user.userId;

      // Get vendor
      const vendor = await Vendor.findOne({ where: { user_id: userId } });
      if (!vendor) {
        res.status(404).json({ error: "Vendor profile not found" });
        return;
      }

      // Get product
      const product = await Product.findByPk(productId);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      // Verify ownership
      if (product.vendor_id !== vendor.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Soft delete (archive)
      product.status = "archived";
      await product.save();

      res.status(200).json({
        message: "Product deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete product error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

export default router;
