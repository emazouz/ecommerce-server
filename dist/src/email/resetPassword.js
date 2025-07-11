"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordMessage = void 0;
const resetPasswordMessage = (link) => {
    return `
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
  `;
};
exports.resetPasswordMessage = resetPasswordMessage;
