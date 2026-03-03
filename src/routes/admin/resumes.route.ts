import express from 'express';

import { protect, adminOnly } from '../../middleware/authMiddleware';
import { getAnalyzedResumesCount } from '../../controllers/admin/resumes/resume.controller';

const router = express.Router();

router.get('/resumes-count', protect, adminOnly, getAnalyzedResumesCount);

export { router as resumeRoutes };