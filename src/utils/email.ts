// utils/email.ts
import nodemailer from "nodemailer";
import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN!;
const SENDER_EMAIL = process.env.GMAIL_SENDER!;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

export const sendResetEmail = async (to: string, link: string) => {
  const accessToken = await oAuth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: SENDER_EMAIL,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: REFRESH_TOKEN,
      accessToken: accessToken.token!,
    },
  });

  await transporter.sendMail({
    from: `YourApp <${SENDER_EMAIL}>`,
    to,
    subject: "Reset your password",
    html: `<p>You requested to reset your password. Click the link below:</p>
           <a href="${link}">${link}</a>
           <p>This link will expire in 1 hour.</p>`,
  });
};