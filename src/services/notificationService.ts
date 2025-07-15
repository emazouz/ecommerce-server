import { prisma } from "../utils/prisma";
import { ApiError } from "../utils/ApiError";
import {
  CreateNotificationData,
  NotificationFilters,
  NotificationResponse,
  NotificationStats,
  BulkNotificationRequest,
  PaginationParams,
  NotificationTemplate,
} from "../types/notificationTypes";
import { NotificationType } from "@prisma/client";

export class NotificationService {
  // إنشاء إشعار جديد
  static async createNotification(
    data: CreateNotificationData
  ): Promise<NotificationResponse> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          senderId: data.senderId || null,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata,
          relatedId: data.relatedId,
          relatedType: data.relatedType,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      return notification as NotificationResponse;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new ApiError(500, "Failed to create notification");
    }
  }

  // إنشاء إشعارات متعددة
  static async createBulkNotifications(
    data: BulkNotificationRequest
  ): Promise<number> {
    try {
      const notifications = data.userIds.map((userId) => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata,
        relatedId: data.relatedId,
        relatedType: data.relatedType,
      }));

      const result = await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true,
      });

      return result.count;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      throw new ApiError(500, "Failed to create bulk notifications");
    }
  }

  // جلب إشعارات المستخدم
  static async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {},
    pagination: PaginationParams = {}
  ): Promise<{
    notifications: NotificationResponse[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = pagination;

      const skip = (page - 1) * limit;

      const whereClause: any = {
        userId,
        isDeleted: false,
      };

      // إضافة فلاتر إضافية
      if (filters.type) whereClause.type = filters.type;
      if (filters.isRead !== undefined) whereClause.isRead = filters.isRead;

      // التعامل مع فلاتر التاريخ
      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) {
          whereClause.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          whereClause.createdAt.lte = filters.endDate;
        }
      }

      const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where: whereClause }),
      ]);

      const hasMore = skip + limit < totalCount;

      return {
        notifications: notifications as NotificationResponse[],
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      throw new ApiError(500, "Failed to fetch notifications");
    }
  }

  // وضع علامة مقروء على إشعار
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationResponse> {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
          isDeleted: false,
        },
      });

      if (!notification) {
        throw new ApiError(404, "Notification not found");
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      return updatedNotification as NotificationResponse;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Failed to mark notification as read");
    }
  }

  // وضع علامة مقروء على جميع الإشعارات
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
          isDeleted: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw new ApiError(500, "Failed to mark all notifications as read");
    }
  }

  // حذف إشعار (soft delete)
  static async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
          isDeleted: false,
        },
      });

      if (!notification) {
        throw new ApiError(404, "Notification not found");
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isDeleted: true },
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Failed to delete notification");
    }
  }

  // حذف جميع الإشعارات
  static async deleteAllNotifications(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      return result.count;
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      throw new ApiError(500, "Failed to delete all notifications");
    }
  }

  // الحصول على إحصائيات الإشعارات
  static async getNotificationStats(
    userId: string
  ): Promise<NotificationStats> {
    try {
      const [totalCount, unreadCount, typeDistribution] = await Promise.all([
        prisma.notification.count({
          where: { userId, isDeleted: false },
        }),
        prisma.notification.count({
          where: { userId, isRead: false, isDeleted: false },
        }),
        prisma.notification.groupBy({
          by: ["type"],
          where: { userId, isDeleted: false },
          _count: {
            type: true,
          },
        }),
      ]);

      const readCount = totalCount - unreadCount;

      const typeDistributionMap = typeDistribution.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<NotificationType, number>);

      return {
        totalCount,
        unreadCount,
        readCount,
        typeDistribution: typeDistributionMap,
      };
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      throw new ApiError(500, "Failed to fetch notification statistics");
    }
  }

  // الحصول على إشعار محدد
  static async getNotificationById(
    notificationId: string,
    userId: string
  ): Promise<NotificationResponse> {
    try {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
          isDeleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      if (!notification) {
        throw new ApiError(404, "Notification not found");
      }

      return notification as NotificationResponse;
    } catch (error) {
      console.error("Error fetching notification:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Failed to fetch notification");
    }
  }

  // الحصول على جميع الإشعارات (للمدير)
  static async getAllNotifications(
    filters: NotificationFilters = {},
    pagination: PaginationParams = {}
  ): Promise<{
    notifications: NotificationResponse[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = pagination;

      const skip = (page - 1) * limit;

      const whereClause: any = {
        isDeleted: false,
      };

      // إضافة فلاتر إضافية
      if (filters.userId) whereClause.userId = filters.userId;
      if (filters.type) whereClause.type = filters.type;
      if (filters.isRead !== undefined) whereClause.isRead = filters.isRead;

      // التعامل مع فلاتر التاريخ
      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) {
          whereClause.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          whereClause.createdAt.lte = filters.endDate;
        }
      }

      const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where: whereClause }),
      ]);

      const hasMore = skip + limit < totalCount;

      return {
        notifications: notifications as NotificationResponse[],
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error("Error fetching all notifications:", error);
      throw new ApiError(500, "Failed to fetch notifications");
    }
  }

  // إشعارات خاصة بالطلبات
  static async createOrderNotification(
    userId: string,
    orderId: string,
    title: string,
    message: string,
    senderId?: string
  ): Promise<NotificationResponse> {
    return this.createNotification({
      userId,
      senderId: senderId || null,
      title,
      message,
      type: NotificationType.ORDER,
      relatedId: orderId,
      relatedType: "order",
    });
  }

  // إشعارات خاصة بالدفع
  static async createPaymentNotification(
    userId: string,
    paymentId: string,
    title: string,
    message: string,
    senderId?: string
  ): Promise<NotificationResponse> {
    return this.createNotification({
      userId,
      senderId: senderId || null,
      title,
      message,
      type: NotificationType.PAYMENT,
      relatedId: paymentId,
      relatedType: "payment",
    });
  }

  // إشعارات خاصة بالشحن
  static async createShipmentNotification(
    userId: string,
    shipmentId: string,
    title: string,
    message: string,
    senderId?: string
  ): Promise<NotificationResponse> {
    return this.createNotification({
      userId,
      senderId: senderId || null,
      title,
      message,
      type: NotificationType.SHIPMENT,
      relatedId: shipmentId,
      relatedType: "shipment",
    });
  }

  // إشعارات خاصة بالمردود
  static async createRefundNotification(
    userId: string,
    refundId: string,
    title: string,
    message: string,
    senderId?: string
  ): Promise<NotificationResponse> {
    return this.createNotification({
      userId,
      senderId: senderId || null,
      title,
      message,
      type: NotificationType.REFUND,
      relatedId: refundId,
      relatedType: "refund",
    });
  }

  // تنظيف الإشعارات القديمة
  static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          isDeleted: true,
        },
      });

      return result.count;
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
      throw new ApiError(500, "Failed to cleanup old notifications");
    }
  }

  // قوالب الإشعارات
  static getNotificationTemplates(): NotificationTemplate[] {
    return [
      {
        type: NotificationType.ORDER,
        titleTemplate: "Order {{status}}",
        messageTemplate: "Your order #{{orderNumber}} has been {{status}}",
        variables: ["status", "orderNumber"],
      },
      {
        type: NotificationType.PAYMENT,
        titleTemplate: "Payment {{status}}",
        messageTemplate: "Your payment of {{amount}} has been {{status}}",
        variables: ["status", "amount"],
      },
      {
        type: NotificationType.SHIPMENT,
        titleTemplate: "Shipment {{status}}",
        messageTemplate: "Your shipment {{trackingNumber}} has been {{status}}",
        variables: ["status", "trackingNumber"],
      },
      {
        type: NotificationType.REFUND,
        titleTemplate: "Refund {{status}}",
        messageTemplate:
          "Your refund request for {{amount}} has been {{status}}",
        variables: ["status", "amount"],
      },
    ];
  }
}
