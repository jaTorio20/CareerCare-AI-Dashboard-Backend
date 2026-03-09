import express from 'express';

import { protect, adminOnly } from '../../middleware/authMiddleware';
import { getAnalyzedResumesCount } from '../../controllers/admin/statistics/resume.controller';
import { getGeneratedCoverLettersCount } from '../../controllers/admin/statistics/coverLetter.controller';

const router = express.Router();

router.get('/resumes-count', protect, adminOnly, getAnalyzedResumesCount);
router.get('/cover-letters-count', protect, adminOnly, getGeneratedCoverLettersCount);

export { router as statisticsRoutes };