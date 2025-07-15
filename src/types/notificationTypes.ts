import { NotificationType } from "@prisma/client";

export interface CreateNotificationData {
  userId: string;
  senderId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  relatedId?: string;
  relatedType?: string;
}

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  isRead?: boolean;
  isDeleted?: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

export interface NotificationResponse {
  id: string;
  userId: string;
  senderId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  isDeleted: boolean;
  metadata?: Record<string, any>;
  relatedId?: string;
  relatedType?: string;
  createdAt: Date;
  readAt?: Date | null;
  sender?: {
    id: string;
    username?: string | null;
    email: string;
    avatar?: string | null;
  } | null;
}

export interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  typeDistribution: Record<NotificationType, number>;
}

export interface BulkNotificationRequest {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  relatedId?: string;
  relatedType?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderNotifications: boolean;
  paymentNotifications: boolean;
  refundNotifications: boolean;
  shipmentNotifications: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "readAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  variables: string[];
}
