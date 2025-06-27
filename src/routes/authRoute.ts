import { Router } from "express";
import { login, register, refreshAccessToken, logout, changePassword, resetPassword, forgotPassword } from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.post("/change-password", changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
export default router;

