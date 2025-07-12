import { Router } from "express";
import { PaymentController } from "../controllers/paymentController";
import { authenticateJwt } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: {
    success: false,
    message: "Too many payment attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for sensitive operations
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================================
// PayPal Routes
// ===========================================

/**
 * @route   POST /api/payment/paypal/create-order
 * @desc    Create PayPal order
 * @access  Private
 */
router.post(
  "/paypal/create-order",
  paymentRateLimit,
  authenticateJwt,
  PaymentController.createPayPalOrder
);

/**
 * @route   POST /api/payment/paypal/capture-order
 * @desc    Capture PayPal order
 * @access  Private
 */
router.post(
  "/paypal/capture-order",
  paymentRateLimit,
  authenticateJwt,
  PaymentController.capturePayPalOrder
);

// ===========================================
// Stripe Routes
// ===========================================

/**
 * @route   POST /api/payment/stripe/create-payment-intent
 * @desc    Create Stripe payment intent
 * @access  Private
 */
router.post(
  "/stripe/create-payment-intent",
  paymentRateLimit,
  authenticateJwt,
  PaymentController.createStripePaymentIntent
);

/**
 * @route   POST /api/payment/stripe/confirm-payment
 * @desc    Confirm Stripe payment
 * @access  Private
 */
router.post(
  "/stripe/confirm-payment",
  paymentRateLimit,
  authenticateJwt,
  PaymentController.confirmStripePayment
);

// ===========================================
// Google Pay Routes
// ===========================================

/**
 * @route   POST /api/payment/google-pay/process
 * @desc    Process Google Pay payment
 * @access  Private
 */
router.post(
  "/google-pay/process",
  paymentRateLimit,
  authenticateJwt,
  PaymentController.processGooglePayPayment
);

// ===========================================
// Cash on Delivery Routes
// ===========================================

/**
 * @route   POST /api/payment/cod/process-order
 * @desc    Process COD order
 * @access  Private
 */
router.post(
  "/cod/process-order",
  paymentRateLimit,
  authenticateJwt,
  PaymentController.processCODOrder
);

/**
 * @route   POST /api/payment/cod/confirm-payment
 * @desc    Confirm COD payment (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/cod/confirm-payment",
  strictRateLimit,
  authenticateJwt,
  PaymentController.confirmCODPayment
);

// ===========================================
// Common Payment Routes
// ===========================================

/**
 * @route   GET /api/payment/session/:orderId
 * @desc    Get payment session
 * @access  Private
 */
router.get(
  "/session/:orderId",
  authenticateJwt,
  PaymentController.getPaymentSession
);

/**
 * @route   POST /api/payment/cancel/:orderId
 * @desc    Cancel payment session
 * @access  Private
 */
router.post(
  "/cancel/:orderId",
  strictRateLimit,
  authenticateJwt,
  PaymentController.cancelPaymentSession
);

/**
 * @route   POST /api/payment/refund
 * @desc    Process refund (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/refund",
  strictRateLimit,
  authenticateJwt,
  PaymentController.processRefund
);

// ===========================================
// Webhook Routes (No authentication required)
// ===========================================

/**
 * @route   POST /api/payment/webhook/stripe
 * @desc    Handle Stripe webhooks
 * @access  Public (but verified)
 */
router.post("/webhook/stripe", PaymentController.handleStripeWebhook);

/**
 * @route   POST /api/payment/webhook/paypal
 * @desc    Handle PayPal webhooks
 * @access  Public (but verified)
 */
router.post("/webhook/paypal", PaymentController.handlePayPalWebhook);

export default router;
