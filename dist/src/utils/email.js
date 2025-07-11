"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailConfig = exports.sendResetEmail = void 0;
// utils/email.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create reusable transporter
const transporter = nodemailer_1.default.createTransport({
    service: "gmail", // Using 'gmail' service instead of manual SMTP configuration
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // This should be an App Password, not your regular Gmail password
    },
});
const sendResetEmail = async (to, message) => {
    try {
        // Send mail
        const info = await transporter.sendMail({
            from: `"Password Reset" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: "Reset your password",
            html: message,
        });
        return info;
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
};
exports.sendResetEmail = sendResetEmail;
// Add this function to test the email configuration
const testEmailConfig = async () => {
    try {
        // Verify connection configuration
        await transporter.verify();
        console.log("Email configuration is valid");
        return true;
    }
    catch (error) {
        console.error("Email configuration error:", error);
        return false;
    }
};
exports.testEmailConfig = testEmailConfig;
