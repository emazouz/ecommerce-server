import { Router } from "express";
import {
  getProfile,
  updateProfile,
  updateUserInformation,
  testUpdateAddress,
} from "../controllers/profileController";
import { authenticateJwt } from "../middleware/authMiddleware";
import uploadMiddleware from "../middleware/uploadMiddleware";

const router = Router();

// All profile routes are protected
router.use(authenticateJwt);

router.route("/").get(getProfile);
router.route("/").put(updateProfile);
router
  .route("/update-user-information")
  .post(uploadMiddleware, updateUserInformation);
router.route("/test-address").post(testUpdateAddress);

export default router;
