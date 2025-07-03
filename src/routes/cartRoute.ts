import { Router } from "express";
import {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from "../controllers/cartController";
import { authenticateJwt } from "../middleware/authMiddleware";

const router = Router();

// All routes after this middleware are protected
router.use(authenticateJwt);

router.route("/").post(addToCart).get(getCart).delete(clearCart);

router
  .route("/items/:itemId")
  .put(updateCartItemQuantity)
  .delete(removeCartItem);

export default router;
