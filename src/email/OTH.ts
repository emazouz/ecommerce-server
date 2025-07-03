// email verification message
export const emailVerificationMessage = (code: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <div style="text-align: center; margin: 30px 0;">
       <p>Your verification code is:</p>
       <p style="font-size: 24px; font-weight: bold;">${code}</p>
       <p>This code will expire in 1 hour.</p>
       <p>If you didn't request this, please ignore this email.</p>
      <hr>
       <p style="color: #666; font-size: 12px;">If the code doesn't work, copy and paste this code in your browser:</p>
      </div>
    </div>
  `;
};
