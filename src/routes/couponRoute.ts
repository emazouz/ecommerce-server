import { Router } from "express";
import {
  createCoupon,
  deleteCoupon,
  fetchAllCoupons,
  getCouponById,
  updateCoupon,
  applyCoupon,
} from "../controllers/couponController";
import { authenticateJwt, isAdmin } from "../middleware/authMiddleware";

const router = Router();

// --- Admin Routes (Protected by isAdmin) ---
router
  .route("/")
  .get(authenticateJwt, isAdmin, fetchAllCoupons)
  .post(authenticateJwt, isAdmin, createCoupon);
  
  router
  .route("/:id")
  .get(authenticateJwt, isAdmin, getCouponById)
  .put(authenticateJwt, isAdmin, updateCoupon)
  .delete(authenticateJwt, isAdmin, deleteCoupon);

// --- User Route ---
router.route("/apply").post(authenticateJwt, applyCoupon);

export default router;
