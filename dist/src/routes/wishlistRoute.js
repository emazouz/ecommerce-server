"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const wishlistController_1 = require("../controllers/wishlistController");
const router = (0, express_1.Router)();
// All wishlist routes require authentication
router.use(authMiddleware_1.authenticateJwt);
// Add product to wishlist
router.post("/", wishlistController_1.addToWishlist);
// Get user's wishlist
router.get("/", wishlistController_1.getUserWishlist);
// Check if product is in wishlist
router.get("/check/:productId", wishlistController_1.isInWishlist);
// Remove product from wishlist
router.delete("/:productId", wishlistController_1.removeFromWishlist);
// Clear entire wishlist
router.delete("/", wishlistController_1.clearWishlist);
exports.default = router;
