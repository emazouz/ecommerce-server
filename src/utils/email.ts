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

export const sendResetEmail = async (to: string, link: string) => {
  try {
    // Send mail
    const info = await transporter.sendMail({
      from: `"Password Reset" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You have requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" 
               style="background-color: #4CAF50; 
                      color: white; 
                      padding: 14px 20px; 
                      text-decoration: none; 
                      border-radius: 4px;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link in your browser:</p>
          <p style="color: #666; font-size: 12px;">${link}</p>
        </div>
      `,
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
