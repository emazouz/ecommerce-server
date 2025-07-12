# 🔧 Payment System Environment Setup

This document outlines the required environment variables for the payment system.

## 📋 Required Environment Variables

Add these variables to your `.env` file in the server directory:

### PayPal Configuration

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
# For production use: https://api-m.paypal.com
```

### Stripe Configuration

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
# For production use: sk_live_your_stripe_secret_key
```

### Google Pay Configuration

```bash
# Google Pay Configuration
GOOGLE_PAY_MERCHANT_ID=your_google_pay_merchant_id
GOOGLE_PAY_MERCHANT_NAME="Your Store Name"
```

### Company Information

```bash
# Company Information
COMPANY_NAME="Your Store Name"
CLIENT_URL=http://localhost:3000
```

## 🌐 Client Environment Variables

Add these variables to your `.env.local` file in the client directory:

### PayPal Configuration

```bash
# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
```

### Stripe Configuration

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
# For production use: pk_live_your_stripe_publishable_key
```

### Google Pay Configuration

```bash
# Google Pay Configuration
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=your_google_pay_merchant_id
NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT=TEST
# For production use: PRODUCTION
```

### API Configuration

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🔐 How to Get Payment Credentials

### PayPal Setup

1. Go to [PayPal Developer](https://developer.paypal.com/)
2. Create a new app
3. Get your Client ID and Client Secret
4. Use sandbox URLs for testing

### Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your API keys from the Developers section
3. Set up webhooks for payment confirmation
4. Use test keys for development

### Google Pay Setup

1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console/)
2. Register your business
3. Get your Merchant ID
4. Configure for web integration

## ⚠️ Security Notes

- Never commit your `.env` files to version control
- Use different keys for development and production
- Regularly rotate your API keys
- Set up proper webhook security for production

## 🚀 Testing

### Test Cards for Stripe

```
Visa: 4242424242424242
Mastercard: 5555555555554444
American Express: 378282246310005
```

### PayPal Sandbox Accounts

Create test accounts in your PayPal Developer dashboard for testing.

### Google Pay Testing

Use test payment methods in the Google Pay console for development.
