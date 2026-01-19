import { ReminderModel, PopulatedReminder, remindBeforeToMs } from "../../models/jobApplication";
import { Request, Response, NextFunction } from "express";
import { processJob } from "../../background/jobProcessor";
import logger from "../../utils/logger";

export const createReminder = 
async (req: Request<any, any, any>, res: Response, next: NextFunction) => {
  try {
    const { id: applicationId } = req.params; // applicationId from URL
    let { type, reminderDate, remindBefore = 'none', message } = req.body;

    if (!applicationId || !type || !reminderDate) { 
      return res.status(400).json({ error: 'Missing required fields' }); 
    }

    const reminderTime = new Date(reminderDate).getTime();
    const now = Date.now();
    const MIN_ADVANCE_MINUTES = 10;
    const MIN_ADVANCE_MS = MIN_ADVANCE_MINUTES * 60 * 1000; // 10 minutes in ms

    // Validate: reminder must be at least 10 minutes in the future
    if (reminderTime < now) {
      return res.status(400).json({ error: "Cannot schedule a reminder in the past" });
    }

    if (reminderTime - now < MIN_ADVANCE_MS) {
      const earliestTime = new Date(now + MIN_ADVANCE_MS).toISOString();
      return res.status(400).json({ 
        error: `Reminder must be scheduled at least ${MIN_ADVANCE_MINUTES} minutes in advance`,
        earliestAllowedTime: earliestTime
      });
    }

    // If remindBefore offset is too large for the selected reminderDate, set remindBefore to 'none'
    if (remindBefore !== 'none') {
      const remindBeforeMs = remindBeforeToMs(remindBefore);
      if (reminderTime - now <= remindBeforeMs) {
        remindBefore = 'none';
      }
    }

    // Check if an active (pending) reminder already exists for this application and type
    const existingReminder = await ReminderModel.findOne({
      applicationId,
      type,
      status: 'pending'
    });

    if (existingReminder) {
      return res.status(409).json({ 
        error: `An active ${type} reminder already exists for this job application`,
        existingReminderId: existingReminder._id,
        hint: "Cancel the existing reminder first before creating a new one"
      });
    }

    const newReminder = new ReminderModel({
      applicationId,
      type,
      reminderDate,
      remindBefore,
      message,
      status: 'pending',
      remindBeforeSent: false
    });
    const savedReminder = await newReminder.save();
    const reminderId = savedReminder._id.toString();

    // Schedule the main reminder job (at reminderDate)
    const mainDelay = reminderTime - now; // Always positive due to validation above
    const mainResult = await processJob(
      'send-reminder', 
      { reminderId, notificationType: 'main' },
      { delay: mainDelay }
    );

    if (mainResult.queued) {
      logger.info({ reminderId, delay: mainDelay }, 'Main reminder scheduled via BullMQ');
    } else {
      logger.info({ reminderId }, 'Main reminder will be handled by cron fallback');
    }

    // Schedule the "remind before" job if configured
    if (remindBefore && remindBefore !== 'none') {
      const remindBeforeMs = remindBeforeToMs(remindBefore);
      const earlyReminderTime = reminderTime - remindBeforeMs;
      const earlyDelay = Math.max(0, earlyReminderTime - now);

      // Only schedule if the early reminder time is in the future
      if (earlyReminderTime > now) {
        const earlyResult = await processJob(
          'send-reminder',
          { reminderId, notificationType: 'remind-before' },
          { delay: earlyDelay }
        );

        if (earlyResult.queued) {
          logger.info({ reminderId, delay: earlyDelay, remindBefore }, 'Remind-before scheduled via BullMQ');
        } else {
          logger.info({ reminderId, remindBefore }, 'Remind-before will be handled by cron fallback');
        }
      } else {
        logger.info({ reminderId, remindBefore }, 'Remind-before time already passed, skipping');
      }
    }

    res.status(201).json(savedReminder);
  } catch (err) {
    next(err);
  }
}

export const getRemindersByApplication = 
async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: applicationId } = req.params;
    const reminders = await ReminderModel.find({ applicationId });
    res.status(200).json(reminders);
  } catch (err) {
    next(err);
  }
}

// @route DELETE /:id/reminders/:reminderId
// @desc Cancel a reminder - prevents it from being processed
// User can then create a new reminder if needed
export const cancelReminder = 
async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: applicationId, reminderId } = req.params;

    const reminder = await ReminderModel.findOne({
      _id: reminderId,
      applicationId: applicationId
    });

    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found for this job application" });
    }

    // Check if already sent
    if (reminder.status === 'sent') {
      return res.status(400).json({ error: "Cannot cancel a reminder that has already been sent" });
    }

    // Check if already cancelled
    if (reminder.status === 'cancelled') {
      return res.status(400).json({ error: "Reminder is already cancelled" });
    }

    const cancelledReminder = await ReminderModel.findByIdAndUpdate(
      reminderId,
      { status: 'cancelled' },
      { new: true }
    );

    logger.info({ reminderId, applicationId }, 'Reminder cancelled');

    res.status(200).json({ 
      message: "Reminder cancelled successfully",
      reminder: cancelledReminder
    });
  } catch (err) {
    next(err);
  }
}