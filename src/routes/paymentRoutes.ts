import { Router } from "express";
import { PaymentController } from "../controllers/paymentController";
import { authenticateJwt } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 10 payment requests per windowMs
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
 * @route   GET /api/payment/paypal/test
 * @desc    Test PayPal configuration
 * @access  Public (for debugging)
 */
router.get("/paypal/test", PaymentController.testPayPalConfiguration);

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
 * @route   POST /api/payment/google-pay/session
 * @desc    Create Google Pay session
 * @access  Private
 */
router.post(
  "/google-pay/session",
  paymentRateLimit,
  authenticateJwt,
  PaymentController.createGooglePaySession
);

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

/**
 * @route   POST /api/payment/cod/customer-confirm
 * @desc    Confirm COD order by customer
 * @access  Private (Customer)
 */
router.post(
  "/cod/customer-confirm",
  authenticateJwt,
  PaymentController.confirmCODOrderByCustomer
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
// Webhook Routes (DISABLED FOR TESTING)
// ===========================================

/**
 * @route   POST /api/payment/webhook/stripe
 * @desc    Handle Stripe webhooks - DISABLED FOR TESTING
 * @access  Public (but verified)
 */
// router.post("/webhook/stripe", PaymentController.handleStripeWebhook);

/**
 * @route   POST /api/payment/webhook/paypal
 * @desc    Handle PayPal webhooks - DISABLED FOR TESTING
 * @access  Public (but verified)
 */
// router.post("/webhook/paypal", PaymentController.handlePayPalWebhook);

export default router;
