import dotenv from 'dotenv';
import axios from "axios";

dotenv.config();

interface SendVerificationEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

export async function sendVerificationEmail({ to, subject, html, text  }: SendVerificationEmailParams): Promise<boolean> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    throw new Error("Brevo API key or sender email not configured");
  }
  
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: SENDER_EMAIL, name: 'CareerCare' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
      }
    );

    console.log('Email sent successfully:', response.data);
    return true;
  } catch (err) {
    console.error('Error sending email: ', err);
    return false;
  }
}