import { Router } from "express";
import {
  addToCart,
  getCart,
  updateCartItemQuantity,
  updateCartItemDetails,
  removeCartItem,
  clearCart,
  updateCartSettings,
  applyCouponToCart,
  removeCouponFromCart,
} from "../controllers/cartController";
import { authenticateJwt } from "../middleware/authMiddleware";

const router = Router();

// All routes after this middleware are protected
router.use(authenticateJwt);

// Basic cart operations
router.route("/").post(addToCart).get(getCart).delete(clearCart);

// Cart item operations
router
  .route("/items/:itemId")
  .put(updateCartItemQuantity)
  .delete(removeCartItem);

// Cart item details (gift message, customization, etc.)
router.route("/items/:itemId/details").put(updateCartItemDetails);

// Cart settings (payment method, shipping method, etc.)
router.route("/settings").put(updateCartSettings);

// Coupon operations
router.route("/coupon").post(applyCouponToCart).delete(removeCouponFromCart);

export default router;
