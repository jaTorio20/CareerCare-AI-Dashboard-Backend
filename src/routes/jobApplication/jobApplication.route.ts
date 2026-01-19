import express from 'express'

import { uploadSingle } from '../../middleware/uploadMiddleware';
import { protect } from '../../middleware/authMiddleware';

import {  createJobApplication, getAllJobApplications,
  getJobApplicationById, deleteJobApplication, updateJobApplication,
  downloadResumeFile,
  createReminder, getRemindersByApplication, cancelReminder
 } from '../../controllers/jobApplication/index';

// VALIDATION 
import { validate } from '../../middleware/validate';
import { createJobApplicationSchema, deleteJobApplicationSchema, 
  updateJobApplicationSchema, } from './jobApplication.schema';

const router = express.Router();

// JOB APPLICATION ROUTES (/api/job-application)
router.post('/', protect, uploadSingle("resumeFile"), 
  validate(createJobApplicationSchema), createJobApplication);

router.get('/', protect, getAllJobApplications);

router.get('/:id', protect, getJobApplicationById);

router.put('/:id', protect, uploadSingle("resumeFile"),
  validate(updateJobApplicationSchema), updateJobApplication);

router.delete("/:id", protect, 
  validate(deleteJobApplicationSchema), deleteJobApplication );

router.get("/:id/download", protect, downloadResumeFile);

// REMINDER ROUTES (/api/job-application/:id/reminders)
router.post('/:id/reminders', createReminder);
router.get('/:id/reminders', getRemindersByApplication);
router.delete('/:id/reminders/:reminderId', cancelReminder);

export default router;

