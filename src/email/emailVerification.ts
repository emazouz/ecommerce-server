export const emailVerificationMessage = (code: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="text-align: center; margin: 30px 0; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
        ${code}
      </div>
      <p>This code will expire in 1 hour.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
    </div>
  `;
};
