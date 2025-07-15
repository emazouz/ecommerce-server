import { NotificationService } from "../services/notificationService";
import { NotificationType } from "@prisma/client";

export class NotificationHelpers {
  // إشعار تأكيد الطلب
  static async notifyOrderConfirmed(userId: string, orderNumber: string) {
    return NotificationService.createOrderNotification(
      userId,
      orderNumber,
      "Order Confirmed",
      `Your order #${orderNumber} has been confirmed and is being processed.`
    );
  }

  // إشعار شحن الطلب
  static async notifyOrderShipped(
    userId: string,
    orderNumber: string,
    trackingNumber: string
  ) {
    return NotificationService.createOrderNotification(
      userId,
      orderNumber,
      "Order Shipped",
      `Your order #${orderNumber} has been shipped. Tracking number: ${trackingNumber}`
    );
  }

  // إشعار تسليم الطلب
  static async notifyOrderDelivered(userId: string, orderNumber: string) {
    return NotificationService.createOrderNotification(
      userId,
      orderNumber,
      "Order Delivered",
      `Your order #${orderNumber} has been delivered successfully.`
    );
  }

  // إشعار نجاح الدفع
  static async notifyPaymentSuccessful(
    userId: string,
    amount: number,
    paymentId: string
  ) {
    return NotificationService.createPaymentNotification(
      userId,
      paymentId,
      "Payment Successful",
      `Your payment of $${amount} has been processed successfully.`
    );
  }

  // إشعار فشل الدفع
  static async notifyPaymentFailed(
    userId: string,
    amount: number,
    paymentId: string
  ) {
    return NotificationService.createPaymentNotification(
      userId,
      paymentId,
      "Payment Failed",
      `Your payment of $${amount} could not be processed. Please try again.`
    );
  }

  // إشعار موافقة على المردود
  static async notifyRefundApproved(
    userId: string,
    amount: number,
    refundId: string
  ) {
    return NotificationService.createRefundNotification(
      userId,
      refundId,
      "Refund Approved",
      `Your refund request for $${amount} has been approved and will be processed within 3-5 business days.`
    );
  }

  // إشعار رفض المردود
  static async notifyRefundRejected(
    userId: string,
    amount: number,
    refundId: string,
    reason: string
  ) {
    return NotificationService.createRefundNotification(
      userId,
      refundId,
      "Refund Rejected",
      `Your refund request for $${amount} has been rejected. Reason: ${reason}`
    );
  }

  // إشعار تحديث حالة الشحن
  static async notifyShipmentUpdate(
    userId: string,
    trackingNumber: string,
    status: string
  ) {
    return NotificationService.createShipmentNotification(
      userId,
      trackingNumber,
      "Shipment Update",
      `Your shipment ${trackingNumber} status has been updated to: ${status}`
    );
  }

  // إشعار جماعي للعروض الخاصة
  static async notifySpecialOffer(
    userIds: string[],
    title: string,
    message: string
  ) {
    return NotificationService.createBulkNotifications({
      userIds,
      title,
      message,
      type: NotificationType.ORDER, // أو يمكن إضافة نوع PROMOTION
    });
  }

  // إشعار انتهاء الصلاحية
  static async notifyExpiration(
    userId: string,
    itemType: string,
    itemName: string
  ) {
    return NotificationService.createNotification({
      userId,
      title: `${itemType} Expiring Soon`,
      message: `Your ${itemType} "${itemName}" is expiring soon. Please take action.`,
      type: NotificationType.ORDER,
    });
  }
}
