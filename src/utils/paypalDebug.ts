export interface PayPalDebugInfo {
  hasCredentials: boolean;
  baseUrl: string;
  clientIdLength?: number;
  clientSecretLength?: number;
  missingEnvVars: string[];
  suggestions: string[];
}

export const diagnosePayPalIssues = (): PayPalDebugInfo => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const baseUrl =
    process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const clientUrl = process.env.CLIENT_URL;
  const companyName = process.env.COMPANY_NAME;

  const missingEnvVars: string[] = [];
  const suggestions: string[] = [];

  if (!clientId) {
    missingEnvVars.push("PAYPAL_CLIENT_ID");
  }

  if (!clientSecret) {
    missingEnvVars.push("PAYPAL_CLIENT_SECRET");
  }

  if (!clientUrl) {
    missingEnvVars.push("CLIENT_URL");
    suggestions.push("Add CLIENT_URL=http://localhost:3000 to your .env file");
  }

  if (!companyName) {
    suggestions.push("Add COMPANY_NAME=Your Store Name to your .env file");
  }

  if (baseUrl.includes("sandbox")) {
    suggestions.push(
      "You're using PayPal Sandbox. Make sure you're using sandbox credentials."
    );
  } else {
    suggestions.push(
      "You're using PayPal Production. Make sure you're using production credentials."
    );
  }

  if (clientId && clientId.length < 10) {
    suggestions.push(
      "PayPal Client ID seems too short. Check if it's correct."
    );
  }

  if (clientSecret && clientSecret.length < 10) {
    suggestions.push(
      "PayPal Client Secret seems too short. Check if it's correct."
    );
  }

  return {
    hasCredentials: !!(clientId && clientSecret),
    baseUrl,
    clientIdLength: clientId?.length,
    clientSecretLength: clientSecret?.length,
    missingEnvVars,
    suggestions,
  };
};

export const logPayPalDebugInfo = (): void => {
  const debugInfo = diagnosePayPalIssues();

  console.log("=== PayPal Configuration Debug ===");
  console.log("Has Credentials:", debugInfo.hasCredentials);
  console.log("Base URL:", debugInfo.baseUrl);
  console.log("Client ID Length:", debugInfo.clientIdLength || "Not set");
  console.log(
    "Client Secret Length:",
    debugInfo.clientSecretLength || "Not set"
  );

  if (debugInfo.missingEnvVars.length > 0) {
    console.log("Missing Environment Variables:", debugInfo.missingEnvVars);
  }

  if (debugInfo.suggestions.length > 0) {
    console.log("Suggestions:");
    debugInfo.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }

  console.log("====================================");
};
