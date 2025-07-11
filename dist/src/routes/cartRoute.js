"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartController_1 = require("../controllers/cartController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// All routes after this middleware are protected
router.use(authMiddleware_1.authenticateJwt);
// Basic cart operations
router.route("/").post(cartController_1.addToCart).get(cartController_1.getCart).delete(cartController_1.clearCart);
// Cart item operations
router
    .route("/items/:itemId")
    .put(cartController_1.updateCartItemQuantity)
    .delete(cartController_1.removeCartItem);
// Cart item details (gift message, customization, etc.)
router.route("/items/:itemId/details").put(cartController_1.updateCartItemDetails);
// Cart settings (payment method, shipping method, etc.)
router.route("/settings").put(cartController_1.updateCartSettings);
// Coupon operations
router.route("/coupon").post(cartController_1.applyCouponToCart).delete(cartController_1.removeCouponFromCart);
exports.default = router;
