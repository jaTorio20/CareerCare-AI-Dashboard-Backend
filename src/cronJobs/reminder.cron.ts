import cron from 'node-cron';
import { ReminderModel, PopulatedReminder, remindBeforeToMs } from '../models/jobApplication';
import { checkRedisQuota } from '../lib/checkRedisQuota';
import { sendReminderEmail } from '../services/jobApplication/sendReminder.service';
import logger from '../utils/logger';

const BATCH_SIZE = 50;
const LOOKBACK_MINUTES = 5;  
const LOOKAHEAD_MINUTES = 2;

let lastQuotaExceeded: boolean | null = null;

/**
 * Cron job that runs every minute as a FALLBACK when Redis quota is exceeded.
 * 
 * Architecture:
 * - PRIMARY: Redis/BullMQ handles reminders via background worker
 * - FALLBACK: This cron kicks in ONLY when Redis quota is exceeded
 * 
 * Handles TWO types of notifications:
 * 1. "remind-before" - Early warning (15m, 30m, 1h, 2h before reminderDate)
 * 2. "main" - The actual reminder at reminderDate
 * 
 * Time window explanation:
 * - LOOKBACK: Catches reminders that were slightly overdue (missed in previous runs)
 * - LOOKAHEAD: Pre-processes reminders about to be due
 */
async function processDueReminders(): Promise<void> {
  const quota = await checkRedisQuota();

  // Log only if the quota state has changed
  if (quota.exceeded !== lastQuotaExceeded) {
    if (quota.exceeded) {
      logger.info('Redis quota exceeded - cron fallback processing reminders');
    } else {
      logger.info('Redis quota available - BullMQ worker resumes handling reminders');
    }
    lastQuotaExceeded = quota.exceeded;
  }

  if (!quota.exceeded) {
    return;
  }

  const now = new Date();
  const nowMs = now.getTime();

  // Calculate time window for main reminders
  const lookbackTime = new Date(nowMs - LOOKBACK_MINUTES * 60 * 1000);
  const lookaheadTime = new Date(nowMs + LOOKAHEAD_MINUTES * 60 * 1000);

  try {
    // === PROCESS MAIN REMINDERS ===
    // Find reminders where reminderDate is in the time window and status is pending
    const mainReminders = await ReminderModel.find({
      status: 'pending',
      reminderDate: {
        $gte: lookbackTime,
        $lte: lookaheadTime
      }
    })
    .populate({
      path: 'applicationId',
      populate: { path: 'userId', select: 'email' }
    })
    .limit(BATCH_SIZE)
    .lean() as unknown as (PopulatedReminder & { _id: string })[];

    logger.info({ count: mainReminders.length }, 'Cron fallback: found main reminders to process');

    // Process main reminders
    if (mainReminders.length > 0) {
      const mainResults = await Promise.allSettled(
        mainReminders.map(reminder => processReminderInline(reminder, 'main'))
      );
      logResults(mainResults, mainReminders, 'main');
    }

    // === PROCESS REMIND-BEFORE NOTIFICATIONS ===
    // For each remindBefore option, calculate when those should fire
    // and find reminders that haven't sent the early notification yet
    const remindBeforeOptions = ['15m', '30m', '1h', '2h'] as const;
    
    for (const remindBefore of remindBeforeOptions) {
      const offsetMs = remindBeforeToMs(remindBefore);
      
      // If remindBefore is 30m, and now is 10:00, we want reminders where:
      // reminderDate is between 10:05 (now + 5min lookback offset + 30m) and 10:32 (now + 2min lookahead + 30m)
      const earlyLookbackTime = new Date(nowMs + offsetMs - LOOKBACK_MINUTES * 60 * 1000);
      const earlyLookaheadTime = new Date(nowMs + offsetMs + LOOKAHEAD_MINUTES * 60 * 1000);

      const earlyReminders = await ReminderModel.find({
        remindBefore: remindBefore,
        remindBeforeSent: false,
        reminderDate: {
          $gte: earlyLookbackTime,
          $lte: earlyLookaheadTime
        }
      })
      .populate({
        path: 'applicationId',
        populate: { path: 'userId', select: 'email' }
      })
      .limit(BATCH_SIZE)
      .lean() as unknown as (PopulatedReminder & { _id: string })[];

      if (earlyReminders.length > 0) {
        logger.info({ count: earlyReminders.length, remindBefore }, 'Cron fallback: found remind-before notifications');
        
        const earlyResults = await Promise.allSettled(
          earlyReminders.map(reminder => processReminderInline(reminder, 'remind-before'))
        );
        logResults(earlyResults, earlyReminders, `remind-before (${remindBefore})`);
      }
    }

  } catch (error) {
    logger.error({ error }, 'Cron fallback: reminder processing failed');
  }
}

/**
 * Log batch processing results
 */
function logResults(
  results: PromiseSettledResult<void>[], 
  reminders: { _id: string }[],
  type: string
): void {
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info({ 
    type,
    total: reminders.length, 
    succeeded, 
    failed 
  }, 'Cron fallback: batch processing complete');
}

/**
 * Process a single reminder inline (used when Redis quota exceeded)
 */
async function processReminderInline(
  reminder: PopulatedReminder & { _id: string; status?: string },
  notificationType: 'remind-before' | 'main'
): Promise<void> {
  try {
    // Skip if cancelled
    if (reminder.status === 'cancelled') {
      logger.info({ reminderId: reminder._id }, 'Cron fallback: reminder cancelled, skipping');
      return;
    }

    // Validate populated data
    if (!reminder.applicationId || typeof reminder.applicationId !== 'object') {
      logger.error({ reminderId: reminder._id }, 'Cron fallback: job application not found');
      return;
    }

    const userEmail = (reminder.applicationId.userId as unknown as { email: string })?.email;
    if (!userEmail) {
      logger.error({ reminderId: reminder._id }, 'Cron fallback: user email not found');
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
      await ReminderModel.findByIdAndUpdate(reminder._id, { remindBeforeSent: true });
      logger.info({ reminderId: reminder._id, userEmail }, 'Cron fallback: remind-before email sent');
    } else {
      await ReminderModel.findByIdAndUpdate(reminder._id, { status: 'sent' });
      logger.info({ reminderId: reminder._id, userEmail }, 'Cron fallback: main reminder email sent');
    }
  } catch (error) {
    logger.error({ reminderId: reminder._id, notificationType, error }, 'Cron fallback: failed to process reminder');
    throw error;
  }
}

/**
 * Start the reminder cron job
 * Runs every minute but only processes when Redis quota is exceeded
 */
export function startReminderCron(): void {
  // Run every minute: "* * * * *"
  cron.schedule('* * * * *', async () => {
    await processDueReminders();
  });

  logger.info('Reminder cron fallback started - checks every minute, processes only when Redis quota exceeded');
}

/**
 * Manually trigger reminder processing for testing
 */
export { processDueReminders };
