
export const sendToAllUsers = (message: string) => {
    return `
     <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f9f9; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background-color:#4f46e5; padding:20px; color:white; text-align:center; font-size:20px; font-weight:bold;">
              📧 A Message from Our Team
            </td>
          </tr>

          <tr>
            <td style="padding:30px;">
              <h2 style="color:#333; text-align:center;">Hello 👋</h2>

              <p style="color:#555; font-size:16px; line-height:1.8; text-align:center;">
                We’re happy to send you this message:
              </p>

              <div style="background-color:#f1f5f9; padding:20px; border-radius:6px; margin:20px 0; color:#333; font-size:16px; line-height:1.6;">
                <p style="margin:0;">
                  ${message}
                </p>
              </div>

              <p style="color:#555; font-size:14px; line-height:1.6; text-align:center;">
                If you have any questions or feedback, feel free to reply to this email. Thank you for your time!
              </p>

              <div style="text-align:center; margin-top:30px; font-size:14px; color:#999;">
                Best regards,<br/>
                Your Support Team
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f1f5f9; color:#888; text-align:center; padding:10px; font-size:12px;">
              © 2025 All rights reserved. Your Company
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
    `
} 
