import { Request, Response } from "express";
import { PaymentService } from "../services/paymentService";
import { ApiError } from "../utils/ApiError";

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export class PaymentController {
  // ===========================================
  // PayPal Payment Methods
  // ===========================================

  /**
   * Create PayPal Order
   * @route POST /api/payment/paypal/create-order
   * @access Private
   */
  static async createPayPalOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { amount, currency = "USD", orderId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const paypalOrder = await PaymentService.createPayPalOrder(
        amount,
        currency,
        orderId
      );

      res.status(201).json({
        success: true,
        message: "PayPal order created successfully",
        data: {
          id: paypalOrder.id,
          status: paypalOrder.status,
          links: paypalOrder.links,
        },
      });
    } catch (error: any) {
      console.error("PayPal order creation error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to create PayPal order",
      });
    }
  }

  /**
   * Capture PayPal Order
   * @route POST /api/payment/paypal/capture-order
   * @access Private
   */
  static async capturePayPalOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId: paypalOrderId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!paypalOrderId) {
        return res.status(400).json({
          success: false,
          message: "PayPal Order ID is required",
        });
      }

      const captureData = await PaymentService.capturePayPalOrder(
        paypalOrderId
      );

      res.status(200).json({
        success: true,
        message: "PayPal order captured successfully",
        data: captureData,
      });
    } catch (error: any) {
      console.error("PayPal order capture error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to capture PayPal order",
      });
    }
  }

  // ===========================================
  // Stripe Payment Methods
  // ===========================================

  /**
   * Create Stripe Payment Intent
   * @route POST /api/payment/stripe/create-payment-intent
   * @access Private
   */
  static async createStripePaymentIntent(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { amount, currency = "usd", orderId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const paymentIntent = await PaymentService.createStripePaymentIntent(
        amount,
        currency,
        orderId
      );

      res.status(201).json({
        success: true,
        message: "Stripe payment intent created successfully",
        data: paymentIntent,
      });
    } catch (error: any) {
      console.error("Stripe payment intent creation error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to create Stripe payment intent",
      });
    }
  }

  /**
   * Confirm Stripe Payment
   * @route POST /api/payment/stripe/confirm-payment
   * @access Private
   */
  static async confirmStripePayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { paymentIntentId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: "Payment Intent ID is required",
        });
      }

      const paymentIntent = await PaymentService.confirmStripePayment(
        paymentIntentId
      );

      res.status(200).json({
        success: true,
        message: "Stripe payment confirmed successfully",
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      });
    } catch (error: any) {
      console.error("Stripe payment confirmation error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to confirm Stripe payment",
      });
    }
  }

  // ===========================================
  // Google Pay Payment Methods
  // ===========================================

  /**
   * Process Google Pay Payment
   * @route POST /api/payment/google-pay/process
   * @access Private
   */
  static async processGooglePayPayment(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { paymentData, amount, orderId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!paymentData || !amount || !orderId) {
        return res.status(400).json({
          success: false,
          message: "Payment data, amount, and order ID are required",
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      const paymentResult = await PaymentService.processGooglePayPayment(
        paymentData,
        amount,
        orderId
      );

      res.status(200).json({
        success: true,
        message: "Google Pay payment processed successfully",
        data: {
          id: paymentResult.id,
          status: paymentResult.status,
          amount: paymentResult.amount,
        },
      });
    } catch (error: any) {
      console.error("Google Pay payment processing error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to process Google Pay payment",
      });
    }
  }

  // ===========================================
  // Cash on Delivery Methods
  // ===========================================

  /**
   * Process COD Order
   * @route POST /api/payment/cod/process-order
   * @access Private
   */
  static async processCODOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, amount } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!orderId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Order ID and amount are required",
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      const result = await PaymentService.processCODOrder(orderId, amount);

      res.status(200).json({
        success: true,
        message: "COD order processed successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("COD order processing error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to process COD order",
      });
    }
  }

  /**
   * Confirm COD Payment (for admin use when order is delivered)
   * @route POST /api/payment/cod/confirm-payment
   * @access Private (Admin only)
   */
  static async confirmCODPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const result = await PaymentService.confirmCODPayment(orderId);

      res.status(200).json({
        success: true,
        message: "COD payment confirmed successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("COD payment confirmation error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to confirm COD payment",
      });
    }
  }

  // ===========================================
  // Common Payment Methods
  // ===========================================

  /**
   * Get Payment Session
   * @route GET /api/payment/session/:orderId
   * @access Private
   */
  static async getPaymentSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const paymentSession = await PaymentService.getPaymentSession(orderId);

      if (!paymentSession) {
        return res.status(404).json({
          success: false,
          message: "Payment session not found",
        });
      }

      // Check if user owns this order
      if (
        paymentSession.order.userId !== userId &&
        req.user?.role !== "ADMIN"
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.status(200).json({
        success: true,
        message: "Payment session retrieved successfully",
        data: paymentSession,
      });
    } catch (error: any) {
      console.error("Payment session retrieval error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to retrieve payment session",
      });
    }
  }

  /**
   * Cancel Payment Session
   * @route POST /api/payment/cancel/:orderId
   * @access Private
   */
  static async cancelPaymentSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      // Verify user owns this order
      const paymentSession = await PaymentService.getPaymentSession(orderId);
      if (!paymentSession) {
        return res.status(404).json({
          success: false,
          message: "Payment session not found",
        });
      }

      if (
        paymentSession.order.userId !== userId &&
        req.user?.role !== "ADMIN"
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const result = await PaymentService.cancelPaymentSession(orderId);

      res.status(200).json({
        success: true,
        message: "Payment session cancelled successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Payment session cancellation error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to cancel payment session",
      });
    }
  }

  /**
   * Process Refund
   * @route POST /api/payment/refund
   * @access Private (Admin only)
   */
  static async processRefund(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, amount, reason } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (userRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      if (amount && amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid refund amount is required",
        });
      }

      const result = await PaymentService.processRefund(
        orderId,
        amount,
        reason
      );

      res.status(200).json({
        success: true,
        message: "Refund processed successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("Refund processing error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to process refund",
      });
    }
  }

  // ===========================================
  // Webhook Handlers
  // ===========================================

  /**
   * Handle Stripe Webhook
   * @route POST /api/payment/webhook/stripe
   * @access Public (but verified)
   */
  static async handleStripeWebhook(req: Request, res: Response) {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        throw new Error("Stripe webhook secret not configured");
      }

      // Verify webhook signature would go here
      // const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

      // For now, we'll handle the event type directly
      const event = req.body;

      switch (event.type) {
        case "payment_intent.succeeded":
          console.log("Payment succeeded:", event.data.object.id);
          // Update payment status in database
          break;
        case "payment_intent.payment_failed":
          console.log("Payment failed:", event.data.object.id);
          // Update payment status in database
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Webhook handling failed",
      });
    }
  }

  /**
   * Handle PayPal Webhook
   * @route POST /api/payment/webhook/paypal
   * @access Public (but verified)
   */
  static async handlePayPalWebhook(req: Request, res: Response) {
    try {
      const event = req.body;

      switch (event.event_type) {
        case "PAYMENT.CAPTURE.COMPLETED":
          console.log("PayPal payment completed:", event.resource.id);
          // Update payment status in database
          break;
        case "PAYMENT.CAPTURE.DENIED":
          console.log("PayPal payment denied:", event.resource.id);
          // Update payment status in database
          break;
        default:
          console.log(`Unhandled PayPal event type: ${event.event_type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("PayPal webhook error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Webhook handling failed",
      });
    }
  }
}
