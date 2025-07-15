import { Request, Response } from "express";
import { PaymentService } from "../services/paymentService";
import { diagnosePayPalIssues } from "../utils/paypalDebug";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
   * Test PayPal Configuration
   * @route GET /api/payment/paypal/test
   * @access Public (for debugging)
   */
  static async testPayPalConfiguration(req: Request, res: Response) {
    try {
      const debugInfo = diagnosePayPalIssues();

      res.status(200).json({
        success: true,
        message: "PayPal configuration test",
        data: {
          hasCredentials: debugInfo.hasCredentials,
          baseUrl: debugInfo.baseUrl,
          clientIdLength: debugInfo.clientIdLength,
          clientSecretLength: debugInfo.clientSecretLength,
          missingEnvVars: debugInfo.missingEnvVars,
          suggestions: debugInfo.suggestions,
        },
      });
    } catch (error: any) {
      console.error("PayPal test error:", error);
      res.status(500).json({
        success: false,
        message: "PayPal test failed",
        error: error.message,
      });
    }
  }

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

      console.log("Creating PayPal order:", {
        amount,
        currency,
        orderId,
        userId,
      });

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
   * Create Google Pay Session
   * @route POST /api/payment/google-pay/session
   * @access Private
   */
  static async createGooglePaySession(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { amount, currency = "USD", orderId, paymentMethod } = req.body;
      const userId = req.user?.userId;

      console.log("=== createGooglePaySession Controller ===");
      console.log("User ID:", userId);
      console.log("Amount:", amount);
      console.log("Currency:", currency);
      console.log("Order ID:", orderId);
      console.log("Payment Method:", paymentMethod);

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

      const sessionData = await PaymentService.createGooglePaySession(
        amount,
        currency,
        orderId
      );

      res.status(201).json({
        success: true,
        message: "Google Pay session created successfully",
        data: sessionData,
      });
    } catch (error: any) {
      console.error("Google Pay session creation error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to create Google Pay session",
      });
    }
  }

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
      console.log("=== Google Pay Payment Processing ===");
      console.log("Raw request body:", req.body);
      console.log("Request body type:", typeof req.body);
      console.log(
        "Request body keys:",
        req.body ? Object.keys(req.body) : "none"
      );
      console.log(
        "Request body JSON string:",
        JSON.stringify(req.body, null, 2)
      );

      const { paymentData, amount, orderId } = req.body;
      const userId = req.user?.userId;

      console.log("User ID:", userId);
      console.log("Order ID:", orderId);
      console.log("Amount:", amount);
      console.log("Payment data received:", !!paymentData);
      console.log("Payment data type:", typeof paymentData);
      console.log(
        "Payment data keys:",
        paymentData ? Object.keys(paymentData) : "none"
      );
      console.log("Payment data JSON:", JSON.stringify(paymentData, null, 2));

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!paymentData || !amount || !orderId) {
        console.log("❌ Missing required fields:");
        console.log("- paymentData:", !!paymentData);
        console.log("- amount:", !!amount);
        console.log("- orderId:", !!orderId);

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

      // Validate payment data structure
      if (
        !paymentData.paymentMethodData ||
        !paymentData.paymentMethodData.tokenizationData
      ) {
        console.log("❌ Invalid payment data structure");
        return res.status(400).json({
          success: false,
          message: "Invalid Google Pay payment data structure",
        });
      }

      console.log("✅ Validation passed, processing payment...");

      const paymentResult = await PaymentService.processGooglePayPayment(
        paymentData,
        amount,
        orderId
      );

      console.log("✅ Payment processed successfully:", paymentResult.id);

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

  /**
   * Confirm COD Order by Customer
   * @route POST /api/payment/cod/customer-confirm
   * @access Private (Customer only)
   */
  static async confirmCODOrderByCustomer(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { orderId } = req.body;
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

      // Verify that the order belongs to this user
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId: userId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or you don't have permission to access it",
        });
      }

      // Update payment session to COMPLETED
      await prisma.paymentSession.updateMany({
        where: {
          orderId: orderId,
          paymentMethod: "COD",
        },
        data: {
          status: "COMPLETED",
          metadata: {
            confirmedByCustomer: true,
            confirmedAt: new Date().toISOString(),
            customerConfirmation: true,
          },
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PENDING", // Still pending until delivered
          orderStatus: "CONFIRMED",
        },
      });

      res.status(200).json({
        success: true,
        message: "COD order confirmed successfully",
        data: {
          orderId,
          status: "CONFIRMED",
          paymentMethod: "COD",
          message:
            "Your order has been confirmed. You will pay when the order is delivered.",
        },
      });
    } catch (error: any) {
      console.error("COD customer confirmation error:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to confirm COD order",
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
  // Webhook Handlers (DISABLED FOR TESTING)
  // ===========================================

  /**
   * Handle Stripe Webhook - DISABLED FOR TESTING
   * @route POST /api/payment/webhook/stripe
   * @access Public (but verified)
   */
  static async handleStripeWebhook(req: Request, res: Response) {
    try {
      // DISABLED FOR TESTING - Just return success
      console.log("Stripe webhook received (disabled for testing)");
      res.status(200).json({
        received: true,
        message: "Webhook disabled for testing",
      });
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Webhook handling failed",
      });
    }
  }

  /**
   * Handle PayPal Webhook - DISABLED FOR TESTING
   * @route POST /api/payment/webhook/paypal
   * @access Public (but verified)
   */
  static async handlePayPalWebhook(req: Request, res: Response) {
    try {
      // DISABLED FOR TESTING - Just return success
      console.log("PayPal webhook received (disabled for testing)");
      res.status(200).json({
        received: true,
        message: "Webhook disabled for testing",
      });
    } catch (error: any) {
      console.error("PayPal webhook error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Webhook handling failed",
      });
    }
  }
}
