import { Router } from "express";
import {
  getUserNotifications,
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationStats,
  getNotificationById,
  getNotificationTemplates,
  cleanupOldNotifications,
  getAllNotifications,
} from "../controllers/notificationController";
import { authenticateJwt, isAdmin } from "../middleware/authMiddleware";

const router = Router();

// مسارات المستخدم العادي
router.get("/", authenticateJwt, getUserNotifications);
router.get("/stats", authenticateJwt, getNotificationStats);
router.get("/templates", authenticateJwt, getNotificationTemplates);
router.get("/:id", authenticateJwt, getNotificationById);
router.post("/", authenticateJwt, createNotification);
router.post("/bulk", authenticateJwt, createBulkNotifications);
router.put("/:id/read", authenticateJwt, markAsRead);
router.put("/read-all", authenticateJwt, markAllAsRead);
router.delete("/:id", authenticateJwt, deleteNotification);
router.delete("/", authenticateJwt, deleteAllNotifications);

// مسارات المشرف
router.get("/admin/all", authenticateJwt, isAdmin, getAllNotifications);
router.post("/cleanup", authenticateJwt, isAdmin, cleanupOldNotifications);

export default router;
