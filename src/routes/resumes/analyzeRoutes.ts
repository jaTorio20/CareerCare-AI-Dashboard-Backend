import express, { Request, Response, NextFunction } from 'express';
import { uploadMiddleware } from '../../middleware/uploadMiddleware';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { protect } from '../../middleware/authMiddleware';
import { backgroundQueue } from '../../background/queues/background.queue';

// VALIDATOR
import { validate } from '../../middleware/validate';
import { uploadResumeSchema } from './resume.schema';
import { UploadResumeBody } from './resume.schema';

const router = express.Router();

// @route          POST /api/resumes/analyze
// @desccription   CREATE and analyze a resume WITHOUT saving to DB
// @access          Public
router.post("/", protect, uploadMiddleware.single("resumeFile"),
validate(uploadResumeSchema),
 async (req: Request<any, any, UploadResumeBody>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "userId and resumeFile are required" });
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, "resumes/temp"); //resumes folder

    // ENQUEUE BACKGROUND JOB
    await backgroundQueue.add(
      "resume-analysis",
      {
        userId: req.user._id,
        fileBuffer: req.file.buffer.toString("base64"),
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
        cloudinary: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        },
        jobDescription: req.body.jobDescription,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
      }
    );

    res.status(202).json({
      message: "Resume uploaded. Analysis is processing in background.",
    });
  } catch (err: any) {
    next(err)
  }
});

export default router;