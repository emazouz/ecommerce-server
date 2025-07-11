import { Router } from "express";
import { authenticateJwt } from "../middleware/authMiddleware";
import {
  addToCompare,
  removeFromCompare,
  getUserCompareList,
  clearCompareList,
  getComparisonData,
} from "../controllers/compareController";

const router = Router();

// All compare routes require authentication
router.use(authenticateJwt);

// Add product to compare list
router.post("/", addToCompare);

// Get user's compare list
router.get("/", getUserCompareList);

// Get detailed comparison data
router.get("/comparison", getComparisonData);

// Remove product from compare list
router.delete("/:productId", removeFromCompare);

// Clear entire compare list
router.delete("/", clearCompareList);

export default router;
