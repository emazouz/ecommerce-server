"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = (0, express_1.Router)();
// Public routes
router.get("/", productController_1.productController.getAllProducts);
router.get("/search", productController_1.productController.searchProducts);
router.get("/:id", productController_1.productController.getProduct);
router.get("/:id/reviews", productController_1.productController.getProductReviews);
router.get("/:id/variants", productController_1.productController.getProductVariants);
// Protected routes - require authentication
router.use(authMiddleware_1.authenticateJwt);
// add Product Review - Moved to protected routes
// localhost:5000/api/v1/products/1/reviews
router.post("/:id/reviews", uploadMiddleware_1.default, productController_1.productController.addProductReview);
// Reply to a review by an admin
router.post("/reviews/:reviewId/reply", productController_1.productController.addReplyToReview);
// Product CRUD operations
router.post("/", uploadMiddleware_1.default, productController_1.productController.createProduct);
router.put("/:id", uploadMiddleware_1.default, productController_1.productController.updateProduct);
router.delete("/:id", productController_1.productController.deleteProduct);
// Product variants and inventory
router.post("/:id/variants", productController_1.productController.manageProductVariants);
router.post("/:id/inventory", productController_1.productController.manageInventory);
// Product sales and promotions
router.post("/:id/flash-sale", productController_1.productController.manageFlashSale);
router.put("/:id/status", productController_1.productController.updateProductStatus);
router.post("/:id/sales", productController_1.productController.updateProductSales);
exports.default = router;
