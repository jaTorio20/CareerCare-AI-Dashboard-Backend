// scripts/manualReminderTest.ts
import mongoose from 'mongoose';
import { sendReminderEmail } from '../src/services/jobApplication/sendReminder.service';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/careercare';

async function main() {

  try {
    await mongoose.connect(MONGODB_URI);

    const type: 'interview' | 'follow-up' | 'deadline' = 'interview';
    const params = {
      to: 'johnashley132002@gmail.com',
      type,
      reminderDate: new Date(),
      jobTitle: 'Software Engineer',
      companyName: 'Acme Corp',
      message: 'Don\'t forget your interview!',
      isEarlyReminder: false,
      remindBefore: undefined
    };

    const result = await sendReminderEmail(params);
    console.log('Reminder email send result:', result);
  } catch (err) {
    console.error('Error sending reminder email:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
