import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { NotificationService } from "../services/notificationService";
import { ApiError } from "../utils/ApiError";
import { NotificationType } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { sendToAll } from "../utils/email";

// جلب جميع الإشعارات للمستخدم
export const getUserNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = req.query;

    const filters: any = {};
    if (type) filters.type = type as NotificationType;
    if (isRead !== undefined) filters.isRead = isRead === "true";
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as "createdAt" | "readAt" | "title",
      sortOrder: sortOrder as "asc" | "desc",
    };

    const result = await NotificationService.getUserNotifications(
      userId,
      filters,
      pagination
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Notifications retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getUserNotifications:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// إنشاء إشعار جديد
export const createNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId, title, message, type, metadata, relatedId, relatedType } =
      req.body;

    if (!userId || !title || !message || !type) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: userId, title, message, type",
      });
      return;
    }

    const senderId = req.user?.userId;

    // Check if userId is an email address and find the user
    let actualUserId = userId;
    if (userId.includes("@")) {
      const user = await prisma.user.findUnique({
        where: { email: userId },
        select: { id: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found with the provided email",
        });
        return;
      }

      actualUserId = user.id;
    }

    const notification = await NotificationService.createNotification({
      userId: actualUserId,
      senderId,
      title,
      message,
      type,
      metadata,
      relatedId,
      relatedType,
    });

    res.status(201).json({
      success: true,
      data: notification,
      message: "Notification created successfully",
    });
  } catch (error) {
    console.error("Error in createNotification:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// إنشاء إشعارات متعددة
export const createBulkNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userIds, title, message, type, metadata, relatedId, relatedType } =
      req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
      return;
    }

    if (!title || !message || !type) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: title, message, type",
      });
      return;
    }

    const count = await NotificationService.createBulkNotifications({
      userIds,
      title,
      message,
      type,
      metadata,
      relatedId,
      relatedType,
    });

    res.status(201).json({
      success: true,
      data: { count },
      message: `${count} notifications created successfully`,
    });
  } catch (error) {
    console.error("Error in createBulkNotifications:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// وضع علامة مقروء على إشعار
export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const notification = await NotificationService.markAsRead(id, userId);

    res.status(200).json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// وضع علامة مقروء على جميع الإشعارات
export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const count = await NotificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      data: { count },
      message: `${count} notifications marked as read`,
    });
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// حذف إشعار
export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    await NotificationService.deleteNotification(id, userId);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// حذف جميع الإشعارات
export const deleteAllNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const count = await NotificationService.deleteAllNotifications(userId);

    res.status(200).json({
      success: true,
      data: { count },
      message: `${count} notifications deleted successfully`,
    });
  } catch (error) {
    console.error("Error in deleteAllNotifications:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// الحصول على إحصائيات الإشعارات
export const getNotificationStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const stats = await NotificationService.getNotificationStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
      message: "Notification statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getNotificationStats:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// الحصول على إشعار محدد
export const getNotificationById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const notification = await NotificationService.getNotificationById(
      id,
      userId
    );

    res.status(200).json({
      success: true,
      data: notification,
      message: "Notification retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getNotificationById:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// الحصول على قوالب الإشعارات
export const getNotificationTemplates = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const templates = NotificationService.getNotificationTemplates();

    res.status(200).json({
      success: true,
      data: templates,
      message: "Notification templates retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getNotificationTemplates:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// الحصول على جميع الإشعارات (للمدير)
export const getAllNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.user?.role;

    if (userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    const {
      page = 1,
      limit = 20,
      userId,
      type,
      isRead,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = req.query;

    const filters: any = {};
    if (userId) filters.userId = userId as string;
    if (type) filters.type = type as NotificationType;
    if (isRead !== undefined) filters.isRead = isRead === "true";
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as "createdAt" | "readAt" | "title",
      sortOrder: sortOrder as "asc" | "desc",
    };

    const result = await NotificationService.getAllNotifications(
      filters,
      pagination
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "All notifications retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getAllNotifications:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

// تنظيف الإشعارات القديمة (Admin only)
export const cleanupOldNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.user?.role;

    if (userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    const { daysOld = 30 } = req.body;
    const count = await NotificationService.cleanupOldNotifications(daysOld);

    res.status(200).json({
      success: true,
      data: { count },
      message: `${count} old notifications cleaned up successfully`,
    });
  } catch (error) {
    console.error("Error in cleanupOldNotifications:", error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

export const sendEmailToAllUsers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { title, message, type } = req.body;

    console.log("title :", title);
    console.log("message :", message);
    console.log("type :", type);

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: "Data are required.",
      });
    }

    const users = await prisma.user.findMany({
      select: { email: true },
    });

    const emails = users.map((user) => user.email).filter(Boolean);

    if (emails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No user emails found.",
      });
    }

    // Send email to each user (you can batch or use BCC)
    sendToAll(emails, title, message);

    return res.status(200).json({
      success: true,
      message: "Emails sent successfully to all users.",
    });
  } catch (err) {
    console.error("Error sending emails:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while sending emails.",
    });
  }
};
