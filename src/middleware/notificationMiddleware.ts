import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { prisma } from "../utils/prisma";
import { ApiError } from "../utils/ApiError";

export const checkNotificationOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied",
      });
    }

    next();
  } catch (error) {
    console.error("Error in checkNotificationOwnership:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const validateNotificationCreation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { userId, title, message, type } = req.body;

  if (!userId || !title || !message || !type) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: userId, title, message, type",
    });
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Title must be a non-empty string",
    });
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Message must be a non-empty string",
    });
  }

  next();
};
