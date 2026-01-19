import dotenv from 'dotenv';
import axios from "axios";

dotenv.config();

interface SendReminderEmailParams {
  to: string;
  type: 'interview' | 'follow-up' | 'deadline';
  reminderDate: Date;
  jobTitle: string;
  companyName: string;
  message?: string;
  isEarlyReminder?: boolean; 
  remindBefore?: string;
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

const remindBeforeLabels: Record<string, string> = {
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  '2h': '2 hours',
};

export async function sendReminderEmail({
  to,
  type,
  reminderDate,
  jobTitle,
  companyName,
  message,
  isEarlyReminder = false,
  remindBefore
}: SendReminderEmailParams): Promise<boolean> {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    throw new Error("Brevo API key or sender email not configured");
  }

  try {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
    const dateStr = reminderDate.toLocaleString();
    
    let subject: string;
    let htmlContent: string;
    let textContent: string;

    if (isEarlyReminder && remindBefore) {
      const timeLabel = remindBeforeLabels[remindBefore] || remindBefore;
      subject = ` Heads up: ${typeLabel} in ${timeLabel} - ${jobTitle} at ${companyName}`;
      htmlContent = `
        <h1> ${typeLabel} Coming Up!</h1>
        <p>This is your <strong>${timeLabel}</strong> heads-up for your upcoming ${type.replace('-', ' ')}.</p>
        <p><strong>Scheduled:</strong> ${dateStr}</p>
        <p><strong>Position:</strong> ${jobTitle}</p>
        <p><strong>Company:</strong> ${companyName}</p>
        ${message ? `<p><strong>Notes:</strong> ${message}</p>` : ''}
        <p>Make sure you're prepared. Good luck! </p>
      `;
      textContent = `Heads up: ${typeLabel} in ${timeLabel} for ${jobTitle} at ${companyName} on ${dateStr}. ${message ? `Notes: ${message}` : ''} Good luck!`;
    } else {
      subject = ` Reminder: ${typeLabel} NOW - ${jobTitle} at ${companyName}`;
      htmlContent = `
        <h1> ${typeLabel} Reminder</h1>
        <p>Your ${type.replace('-', ' ')} is scheduled for <strong>now</strong>!</p>
        <p><strong>Time:</strong> ${dateStr}</p>
        <p><strong>Position:</strong> ${jobTitle}</p>
        <p><strong>Company:</strong> ${companyName}</p>
        ${message ? `<p><strong>Notes:</strong> ${message}</p>` : ''}
        <p>Best of luck! </p>
      `;
      textContent = `Reminder: ${typeLabel} NOW for ${jobTitle} at ${companyName}. Time: ${dateStr}. ${message ? `Notes: ${message}` : ''} Best of luck!`;
    }

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      { 
        sender: { email: SENDER_EMAIL, name: 'CareerCare' },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
      }
    );

    return response.status === 201 || response.status === 202;
  } catch (err) {
    console.error("Failed to send reminder email:", (err as Error).message);
    return false;
  }
}
