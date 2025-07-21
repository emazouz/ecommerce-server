import { Router } from "express";
import {
  login,
  register,
  refreshAccessToken,
  logout,
  changePassword,
  resetPassword,
  forgotPassword,
  requestEmailChange,
  verifyEmailChange,
  getAllUsers,
  getUserByID,
  updateUserRole,
  deleteUser,
} from "../controllers/authController";
import { authenticateJwt } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.post("/change-password", authenticateJwt, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/request-email-change", authenticateJwt, requestEmailChange);
router.post("/verify-email-change", authenticateJwt, verifyEmailChange);
router.get("/", getAllUsers);
router.get("/:id", getUserByID);
router.post("/:id", updateUserRole);
router.delete('/:id', deleteUser)
export default router;
