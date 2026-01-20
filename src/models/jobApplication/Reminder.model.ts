import mongoose, { InferSchemaType, Schema } from 'mongoose';
import { JobApplication } from './JobApplication.model';

const ReminderSchema = new Schema({
  applicationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'JobApplication', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['interview', 'follow-up', 'deadline'], 
    required: true 
  },
  reminderDate: { 
    type: Date, 
    required: true 
  },
  remindBefore: {
    type: String,
    enum: ['15m', '30m', '1h', '2h', 'none'],
    default: 'none'
  },
  message: { 
    type: String, 
    default: ''
  },
  remindBeforeSent: {
    type: Boolean,
    default: false
  },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'cancelled'], 
    default: 'pending' 
  }
}, { timestamps: true });

ReminderSchema.index({ applicationId: 1 });
ReminderSchema.index({ status: 1, reminderDate: 1 });
ReminderSchema.index({ remindBeforeSent: 1, remindBefore: 1, reminderDate: 1 });

export type Reminder = InferSchemaType<typeof ReminderSchema>;

export interface PopulatedReminder extends Omit<Reminder, 'applicationId'> {
  applicationId: JobApplication;
}

// Helper to convert remindBefore string to milliseconds
export function remindBeforeToMs(remindBefore: string): number {
  const map: Record<string, number> = {
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    'none': 0
  };
  return map[remindBefore] || 0;
}

export const ReminderModel = mongoose.model<Reminder>("Reminder", ReminderSchema);