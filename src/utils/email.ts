// utils/email.ts
import nodemailer from "nodemailer";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Using 'gmail' service instead of manual SMTP configuration
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // This should be an App Password, not your regular Gmail password
  },
});

export const sendResetEmail = async (to: string, message: string) => {
  try {
    // Send mail
    const info = await transporter.sendMail({
      from: `"Password Reset" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: "Reset your password",
      html: message,
    });

    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

// Add this function to test the email configuration
export const testEmailConfig = async () => {
  try {
    // Verify connection configuration
    await transporter.verify();
    console.log("Email configuration is valid");
    return true;
  } catch (error) {
    console.error("Email configuration error:", error);
    return false;
  }
};
