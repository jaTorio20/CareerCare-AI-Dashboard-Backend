import { ReminderModel, PopulatedReminder } from "../../../models/jobApplication";
import { sendReminderEmail } from "../../../services/jobApplication/sendReminder.service";
import logger from "../../../utils/logger";

export interface ReminderJobData {
  reminderId: string;
  notificationType: 'remind-before' | 'main'; // Which notification to send
}

/**
 * Background job handler for sending reminder emails
 * Called by BullMQ worker or inline when Redis quota exceeded
 * 
 * Handles two types of notifications:
 * - 'remind-before': Early warning (15m, 30m, 1h, 2h before)
 * - 'main': The actual reminder at reminderDate
 */
export async function handleReminderJob(data: ReminderJobData): Promise<void> {
  const { reminderId, notificationType } = data;

  try {
    // Fetch and populate the reminder
    const reminder = await ReminderModel.findById(reminderId)
      .populate({
        path: 'applicationId',
        populate: { path: 'userId', select: 'email' }
      }) as PopulatedReminder | null;

    if (!reminder) {
      logger.warn({ reminderId }, 'Reminder not found in job handler');
      return;
    }

    // Skip if cancelled by user
    if (reminder.status === 'cancelled') {
      logger.info({ reminderId }, 'Reminder was cancelled, skipping');
      return;
    }

    // Check if this notification was already sent
    if (notificationType === 'remind-before' && reminder.remindBeforeSent) {
      logger.info({ reminderId }, 'Remind-before already sent, skipping');
      return;
    }
    if (notificationType === 'main' && reminder.status === 'sent') {
      logger.info({ reminderId }, 'Main reminder already sent, skipping');
      return;
    }

    // Validate populated data
    if (!reminder.applicationId || typeof reminder.applicationId !== 'object') {
      logger.error({ reminderId }, 'Job application not found for reminder');
      return;
    }

    const userEmail = (reminder.applicationId.userId as unknown as { email: string })?.email;
    if (!userEmail) {
      logger.error({ reminderId }, 'User email not found for reminder');
      return;
    }

    const isEarlyReminder = notificationType === 'remind-before';

    // Send the email
    await sendReminderEmail({
      to: userEmail,
      type: reminder.type,
      reminderDate: reminder.reminderDate,
      jobTitle: reminder.applicationId.jobTitle,
      companyName: reminder.applicationId.companyName,
      message: reminder.message,
      isEarlyReminder,
      remindBefore: reminder.remindBefore,
    });

    // Update the appropriate status field
    if (notificationType === 'remind-before') {
      await ReminderModel.findByIdAndUpdate(reminderId, { remindBeforeSent: true });
      logger.info({ reminderId, userEmail }, 'Remind-before email sent successfully');
    } else {
      await ReminderModel.findByIdAndUpdate(reminderId, { status: 'sent' });
      logger.info({ reminderId, userEmail }, 'Main reminder email sent successfully');
    }

  } catch (error) {
    logger.error({ reminderId, notificationType, error }, 'Failed to process reminder job');
    throw error; 
  }
}
