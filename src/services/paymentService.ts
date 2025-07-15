import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import Stripe from "stripe";
import { ApiError } from "../utils/ApiError";
import { logPayPalDebugInfo } from "../utils/paypalDebug";

const prisma = new PrismaClient();

// Initialize Stripe with secret key (backend only)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export class PaymentService {
  // ===========================================
  // PayPal Service Methods
  // ===========================================

  /**
   * Generate PayPal access token
   * @returns Promise<string>
   */
  private static async generatePayPalAccessToken(): Promise<string> {
    try {
      // Log debug info on first call
      if (process.env.NODE_ENV === "development") {
        logPayPalDebugInfo();
      }

      const baseUrl =
        process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          "PayPal credentials not configured - PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set"
        );
      }

      console.log("Generating PayPal access token...");

      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("PayPal Authentication Error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });

        let errorMessage = `PayPal authentication failed: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorBody);
          if (errorData.error_description) {
            errorMessage += ` - ${errorData.error_description}`;
          }
        } catch (parseError) {
          if (errorBody) {
            errorMessage += ` - ${errorBody}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = (await response.json()) as { access_token: string };

      if (!data.access_token) {
        throw new Error(
          "PayPal authentication failed: No access token received"
        );
      }

      console.log("PayPal access token generated successfully");
      return data.access_token;
    } catch (error) {
      console.error("PayPal authentication error:", error);
      throw new ApiError(
        500,
        `PayPal authentication error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Create PayPal order
   * @param amount - Order amount
   * @param currency - Currency code (default: USD)
   * @param orderId - Internal order ID
   * @returns Promise<any>
   */
  static async createPayPalOrder(
    amount: number,
    currency: string = "USD",
    orderId: string
  ): Promise<any> {
    try {
      // Validate input parameters
      if (!amount || amount <= 0) {
        throw new Error("Invalid amount: must be greater than 0");
      }

      if (!orderId || orderId.trim() === "") {
        throw new Error("Invalid order ID: order ID is required");
      }

      // Validate currency code
      const supportedCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
      if (!supportedCurrencies.includes(currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      // Check required environment variables
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      const baseUrl =
        process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

      if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured properly");
      }

      const accessToken = await this.generatePayPalAccessToken();

      const orderData = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: currency,
              value: Number(amount).toFixed(2),
            },
            description: `Order ${orderId}`,
          },
        ],
        application_context: {
          brand_name: process.env.COMPANY_NAME || "Your Store",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${clientUrl}/order-confirmation/${orderId}`,
          cancel_url: `${clientUrl}/checkout`,
        },
      };

      console.log(
        "Creating PayPal order with data:",
        JSON.stringify(orderData, null, 2)
      );

      const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("PayPal API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });

        let errorMessage = `PayPal order creation failed: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorBody);
          if (errorData.details && errorData.details.length > 0) {
            errorMessage += ` - ${errorData.details[0].description}`;
          }
        } catch (parseError) {
          // If we can't parse the error, use the raw body
          if (errorBody) {
            errorMessage += ` - ${errorBody}`;
          }
        }

        throw new Error(errorMessage);
      }

      const paypalOrder = (await response.json()) as {
        id: string;
        status: string;
        links?: any[];
      };

      console.log("PayPal order created successfully:", paypalOrder);

      // Store payment session (upsert to handle existing sessions)
      await prisma.paymentSession.upsert({
        where: { orderId },
        update: {
          paymentMethod: "PAYPAL",
          amount,
          currency,
          status: "PENDING",
          paypalOrderId: paypalOrder.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: JSON.parse(JSON.stringify(paypalOrder)),
        },
        create: {
          orderId,
          paymentMethod: "PAYPAL",
          amount,
          currency,
          status: "PENDING",
          paypalOrderId: paypalOrder.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: JSON.parse(JSON.stringify(paypalOrder)),
        },
      });

      return paypalOrder;
    } catch (error) {
      throw new ApiError(
        500,
        `PayPal order creation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Capture PayPal order
   * @param paypalOrderId - PayPal order ID
   * @returns Promise<any>
   */
  static async capturePayPalOrder(paypalOrderId: string): Promise<any> {
    try {
      const accessToken = await this.generatePayPalAccessToken();
      const baseUrl =
        process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

      const response = await fetch(
        `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`PayPal order capture failed: ${response.statusText}`);
      }

      const captureData = (await response.json()) as {
        id: string;
        status: string;
      };

      // Update payment session
      const paymentSession = await prisma.paymentSession.findFirst({
        where: { paypalOrderId },
      });

      if (paymentSession) {
        await prisma.paymentSession.update({
          where: { id: paymentSession.id },
          data: {
            status: captureData.status === "COMPLETED" ? "COMPLETED" : "FAILED",
            metadata: JSON.parse(JSON.stringify(captureData)),
          },
        });

        // Create payment record
        if (captureData.status === "COMPLETED") {
          await this.createPaymentRecord(
            paymentSession.orderId,
            Number(paymentSession.amount),
            "PAYPAL",
            "COMPLETED",
            captureData.id,
            captureData
          );
        }
      }

      return captureData;
    } catch (error) {
      throw new ApiError(
        500,
        `PayPal order capture error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // ===========================================
  // Stripe Service Methods
  // ===========================================

  /**
   * Create Stripe Payment Intent
   * @param amount - Amount in cents
   * @param currency - Currency code
   * @param orderId - Internal order ID
   * @returns Promise<any>
   */
  static async createStripePaymentIntent(
    amount: number,
    currency: string = "usd",
    orderId: string
  ): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          orderId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Store payment session (upsert to handle existing sessions)
      await prisma.paymentSession.upsert({
        where: { orderId },
        update: {
          paymentMethod: "STRIPE",
          amount,
          currency: currency.toUpperCase(),
          status: "PENDING",
          sessionId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
          },
        },
        create: {
          orderId,
          paymentMethod: "STRIPE",
          amount,
          currency: currency.toUpperCase(),
          status: "PENDING",
          sessionId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
          },
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw new ApiError(
        500,
        `Stripe payment intent creation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Confirm Stripe Payment Intent
   * @param paymentIntentId - Payment Intent ID
   * @returns Promise<any>
   */
  static async confirmStripePayment(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      // Update payment session
      const paymentSession = await prisma.paymentSession.findFirst({
        where: { sessionId: paymentIntentId },
      });

      if (paymentSession) {
        const status =
          paymentIntent.status === "succeeded"
            ? "COMPLETED"
            : paymentIntent.status === "requires_payment_method"
            ? "FAILED"
            : "PENDING";

        await prisma.paymentSession.update({
          where: { id: paymentSession.id },
          data: {
            status,
            metadata: {
              paymentIntentId: paymentIntent.id,
              status: paymentIntent.status,
            },
          },
        });

        // Create payment record if successful
        if (paymentIntent.status === "succeeded") {
          await this.createPaymentRecord(
            paymentSession.orderId,
            Number(paymentSession.amount),
            "STRIPE",
            "COMPLETED",
            paymentIntent.id,
            paymentIntent
          );
        }
      }

      return paymentIntent;
    } catch (error) {
      throw new ApiError(
        500,
        `Stripe payment confirmation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // ===========================================
  // Google Pay Service Methods
  // ===========================================

  /**
   * Create Google Pay Session
   * @param amount - Payment amount
   * @param currency - Currency code (default: USD)
   * @param orderId - Internal order ID
   * @returns Promise<any>
   */
  static async createGooglePaySession(
    amount: number,
    currency: string = "USD",
    orderId: string
  ): Promise<any> {
    try {
      console.log("=== createGooglePaySession ===");
      console.log("Amount:", amount);
      console.log("Currency:", currency);
      console.log("Order ID:", orderId);

      // Validate input parameters
      if (!amount || amount <= 0) {
        throw new Error("Invalid amount: must be greater than 0");
      }

      if (!orderId || orderId.trim() === "") {
        throw new Error("Invalid order ID: order ID is required");
      }

      // Store payment session (upsert to handle existing sessions)
      const paymentSession = await prisma.paymentSession.upsert({
        where: { orderId },
        update: {
          paymentMethod: "GOOGLE_PAY",
          amount,
          currency: currency.toUpperCase(),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            sessionCreatedAt: new Date().toISOString(),
            sessionType: "google_pay",
            environment: process.env.NODE_ENV || "development",
          },
        },
        create: {
          orderId,
          paymentMethod: "GOOGLE_PAY",
          amount,
          currency: currency.toUpperCase(),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            sessionCreatedAt: new Date().toISOString(),
            sessionType: "google_pay",
            environment: process.env.NODE_ENV || "development",
          },
        },
      });

      console.log("Google Pay session created:", paymentSession);

      return {
        sessionId: paymentSession.id,
        orderId: paymentSession.orderId,
        amount: paymentSession.amount,
        currency: paymentSession.currency,
        status: paymentSession.status,
        expiresAt: paymentSession.expiresAt,
      };
    } catch (error) {
      console.error("Google Pay session creation error:", error);
      throw new ApiError(
        500,
        `Google Pay session creation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Process Google Pay Payment
   * @param paymentData - Google Pay payment data
   * @param amount - Payment amount
   * @param orderId - Internal order ID
   * @returns Promise<any>
   */
  static async processGooglePayPayment(
    paymentData: any,
    amount: number,
    orderId: string
  ): Promise<any> {
    try {
      // Extract payment token from Google Pay
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;

      // Create payment intent with Google Pay token
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        payment_method: paymentToken,
        confirmation_method: "automatic",
        confirm: true,
        metadata: {
          orderId,
          paymentMethod: "GOOGLE_PAY",
        },
      });

      // Store payment session (upsert to handle existing sessions)
      await prisma.paymentSession.upsert({
        where: { orderId },
        update: {
          paymentMethod: "GOOGLE_PAY",
          amount,
          currency: "USD",
          status:
            paymentIntent.status === "succeeded" ? "COMPLETED" : "PENDING",
          sessionId: paymentIntent.id,
          googlePayToken: paymentToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
          },
        },
        create: {
          orderId,
          paymentMethod: "GOOGLE_PAY",
          amount,
          currency: "USD",
          status:
            paymentIntent.status === "succeeded" ? "COMPLETED" : "PENDING",
          sessionId: paymentIntent.id,
          googlePayToken: paymentToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
          },
        },
      });

      // Create payment record if successful
      if (paymentIntent.status === "succeeded") {
        await this.createPaymentRecord(
          orderId,
          amount,
          "GOOGLE_PAY",
          "COMPLETED",
          paymentIntent.id,
          paymentIntent
        );
      }

      return paymentIntent;
    } catch (error) {
      throw new ApiError(
        500,
        `Google Pay payment processing error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // ===========================================
  // Cash on Delivery Service Methods
  // ===========================================

  /**
   * Process Cash on Delivery Order
   * @param orderId - Internal order ID
   * @param amount - Payment amount
   * @returns Promise<any>
   */
  static async processCODOrder(orderId: string, amount: number): Promise<any> {
    try {
      // Store payment session (upsert to handle existing sessions)
      await prisma.paymentSession.upsert({
        where: { orderId },
        update: {
          paymentMethod: "COD",
          amount,
          currency: "USD",
          status: "PENDING",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          metadata: {
            orderCreatedAt: new Date().toISOString(),
            paymentDueOnDelivery: true,
          },
        },
        create: {
          orderId,
          paymentMethod: "COD",
          amount,
          currency: "USD",
          status: "PENDING",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          metadata: {
            orderCreatedAt: new Date().toISOString(),
            paymentDueOnDelivery: true,
          },
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PENDING",
          orderStatus: "CONFIRMED",
        },
      });

      return {
        success: true,
        message: "COD order processed successfully",
        orderId,
      };
    } catch (error) {
      throw new ApiError(
        500,
        `COD order processing error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Confirm COD Payment on Delivery
   * @param orderId - Internal order ID
   * @returns Promise<any>
   */
  static async confirmCODPayment(orderId: string): Promise<any> {
    try {
      // Update payment session
      await prisma.paymentSession.updateMany({
        where: {
          orderId,
          paymentMethod: "COD",
        },
        data: {
          status: "COMPLETED",
        },
      });

      // Create payment record
      const paymentSession = await prisma.paymentSession.findFirst({
        where: { orderId, paymentMethod: "COD" },
      });

      if (paymentSession) {
        await this.createPaymentRecord(
          orderId,
          Number(paymentSession.amount),
          "COD",
          "COMPLETED",
          `COD_${orderId}`,
          { confirmedAt: new Date() }
        );
      }

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "COMPLETED",
          isDelivered: true,
          deliveredAt: new Date(),
        },
      });

      return {
        success: true,
        message: "COD payment confirmed successfully",
      };
    } catch (error) {
      throw new ApiError(
        500,
        `COD payment confirmation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // ===========================================
  // Common Service Methods
  // ===========================================

  /**
   * Create payment record
   * @param orderId - Order ID
   * @param amount - Payment amount
   * @param paymentMethod - Payment method
   * @param status - Payment status
   * @param transactionId - Transaction ID
   * @param paymentDetails - Payment details
   * @returns Promise<any>
   */
  private static async createPaymentRecord(
    orderId: string,
    amount: number,
    paymentMethod: string,
    status: string,
    transactionId: string,
    paymentDetails: any
  ): Promise<any> {
    try {
      const payment = await prisma.payment.create({
        data: {
          orderId,
          amount,
          currency: "USD",
          paymentMethod: paymentMethod as any,
          provider: this.getProviderName(paymentMethod),
          status: status as any,
          transactionId,
          paymentDetails,
          processedAt: new Date(),
        },
      });

      // Update order payment status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: status as any,
          transactionId,
        },
      });

      return payment;
    } catch (error) {
      throw new ApiError(
        500,
        `Payment record creation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get provider name for payment method
   * @param paymentMethod - Payment method
   * @returns string
   */
  private static getProviderName(paymentMethod: string): string {
    switch (paymentMethod) {
      case "PAYPAL":
        return "PayPal";
      case "STRIPE":
        return "Stripe";
      case "GOOGLE_PAY":
        return "Google Pay";
      case "COD":
        return "Cash on Delivery";
      default:
        return "Unknown";
    }
  }

  /**
   * Get payment session by order ID
   * @param orderId - Order ID
   * @returns Promise<any>
   */
  static async getPaymentSession(orderId: string): Promise<any> {
    try {
      const paymentSession = await prisma.paymentSession.findFirst({
        where: { orderId },
        include: {
          order: true,
        },
      });

      return paymentSession;
    } catch (error) {
      throw new ApiError(
        500,
        `Payment session retrieval error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Cancel payment session
   * @param orderId - Order ID
   * @returns Promise<any>
   */
  static async cancelPaymentSession(orderId: string): Promise<any> {
    try {
      const paymentSession = await prisma.paymentSession.findFirst({
        where: { orderId },
      });

      if (!paymentSession) {
        throw new Error("Payment session not found");
      }

      // Cancel based on payment method
      switch (paymentSession.paymentMethod) {
        case "STRIPE":
          if (paymentSession.sessionId) {
            await stripe.paymentIntents.cancel(paymentSession.sessionId);
          }
          break;
        case "PAYPAL":
          // PayPal orders automatically expire
          break;
        case "GOOGLE_PAY":
          // Google Pay payments are processed immediately
          break;
        case "COD":
          // COD can be cancelled
          break;
      }

      // Update payment session status
      await prisma.paymentSession.update({
        where: { id: paymentSession.id },
        data: {
          status: "FAILED",
        },
      });

      return {
        success: true,
        message: "Payment session cancelled successfully",
      };
    } catch (error) {
      throw new ApiError(
        500,
        `Payment session cancellation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Process refund
   * @param orderId - Order ID
   * @param amount - Refund amount (optional, full refund if not specified)
   * @param reason - Refund reason
   * @returns Promise<any>
   */
  static async processRefund(
    orderId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    try {
      const payment = await prisma.payment.findFirst({
        where: { orderId },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (!payment.transactionId) {
        throw new Error("Transaction ID not found");
      }

      const refundAmount = amount || Number(payment.amount);
      let refundResult;

      // Process refund based on payment method
      switch (payment.paymentMethod) {
        case "STRIPE":
        case "GOOGLE_PAY":
          refundResult = await stripe.refunds.create({
            payment_intent: payment.transactionId,
            amount: Math.round(refundAmount * 100), // Convert to cents
          });
          break;
        case "PAYPAL":
          // PayPal refund implementation
          refundResult = await this.processPayPalRefund(
            payment.transactionId,
            refundAmount
          );
          break;
        case "COD":
          // COD refund (store credit or manual process)
          refundResult = {
            id: `COD_REFUND_${Date.now()}`,
            status: "succeeded",
            amount: refundAmount,
          };
          break;
        default:
          throw new Error("Unsupported payment method for refund");
      }

      // Create refund record
      await prisma.refund.create({
        data: {
          orderId,
          paymentId: payment.id,
          amount: refundAmount,
          reason: "CUSTOMER_REQUEST" as any,
          status: "PROCESSED",
          method: "ORIGINAL_PAYMENT_METHOD",
          processedAt: new Date(),
        },
      });

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmount: refundAmount,
          status:
            refundAmount >= Number(payment.amount) ? "REFUNDED" : "COMPLETED",
        },
      });

      return refundResult;
    } catch (error) {
      throw new ApiError(
        500,
        `Refund processing error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Process PayPal refund
   * @param transactionId - PayPal transaction ID
   * @param amount - Refund amount
   * @returns Promise<any>
   */
  private static async processPayPalRefund(
    transactionId: string,
    amount: number
  ): Promise<any> {
    try {
      const accessToken = await this.generatePayPalAccessToken();
      const baseUrl =
        process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

      const response = await fetch(
        `${baseUrl}/v2/payments/captures/${transactionId}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            amount: {
              currency_code: "USD",
              value: Number(amount).toFixed(2),
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`PayPal refund failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new ApiError(
        500,
        `PayPal refund error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
