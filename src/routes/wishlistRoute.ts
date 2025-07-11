import { Router } from "express";
import { authenticateJwt } from "../middleware/authMiddleware";
import {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  clearWishlist,
  isInWishlist,
} from "../controllers/wishlistController";

const router = Router();

// All wishlist routes require authentication
router.use(authenticateJwt);

// Add product to wishlist
router.post("/", addToWishlist);

// Get user's wishlist
router.get("/", getUserWishlist);

// Check if product is in wishlist
router.get("/check/:productId", isInWishlist);

// Remove product from wishlist
router.delete("/:productId", removeFromWishlist);

// Clear entire wishlist
router.delete("/", clearWishlist);

export default router;
