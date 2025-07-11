import { Router } from "express";
import { productController } from "../controllers/productController";
import { authenticateJwt as authMiddleware } from "../middleware/authMiddleware";
import uploadMiddleware from "../middleware/uploadMiddleware";

const router = Router();

// Public routes
router.get("/", productController.getAllProducts);
router.get("/search", productController.searchProducts);
router.get("/:id", productController.getProduct);
router.get("/:id/reviews", productController.getProductReviews);
router.get("/:id/variants", productController.getProductVariants);

// Protected routes - require authentication
router.use(authMiddleware);

// add Product Review - Moved to protected routes
// localhost:5000/api/v1/products/1/reviews
router.post(
  "/:id/reviews",
  uploadMiddleware,
  productController.addProductReview
);

// Reply to a review by an admin
router.post("/reviews/:reviewId/reply", productController.addReplyToReview);

// Product CRUD operations
router.post("/", uploadMiddleware, productController.createProduct);
router.put("/:id", uploadMiddleware, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Product variants and inventory
router.post("/:id/variants", productController.manageProductVariants);
router.post("/:id/inventory", productController.manageInventory);

// Product sales and promotions
router.post("/:id/flash-sale", productController.manageFlashSale);
router.put("/:id/status", productController.updateProductStatus);
router.post("/:id/sales", productController.updateProductSales);

export default router;
