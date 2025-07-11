import { Router } from "express";
import {
  createBanner,
  fetchAllBanners,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerController";
import { authenticateJwt, isAdmin } from "../middleware/authMiddleware";
import uploadMiddleware from "../middleware/uploadMiddleware";

const router = Router();

// --- Public Route ---
// Fetch all active banners
router.route("/").get(fetchAllBanners);

// --- Admin Routes (Protected) ---
router
  .route("/")
  .post(authenticateJwt, isAdmin, uploadMiddleware, createBanner);

router
  .route("/:id")
  .put(authenticateJwt, isAdmin, uploadMiddleware, updateBanner)
  .delete(authenticateJwt, isAdmin, deleteBanner);

export default router;
