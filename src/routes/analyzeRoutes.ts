import express, { Request, Response, NextFunction } from 'express';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import {uploadToCloudinary} from '../services/cloudinaryService';
import { parseFile } from '../services/fileService';
import { analyzeResume } from '../services/aiService';
import { ResumeModel } from '../models/Resume';

const router = express.Router();

// @route          POST /api/resumes/analyze
// @desccription   CREATE and analyze a resume WITHOUT saving to DB
// @access          Public
router.post("/", uploadMiddleware.single("resumeFile"),
 async (req: Request, res: Response, next: NextFunction) => {
  try {
    // if (!req.body.userId || !req.file) {
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

    // Parse file
    const resumeText = await parseFile(req.file);

    // Run AI analysis
    const analysis = await analyzeResume(resumeText, req.body.jobDescription);

      // Save TEMP record in DB
    const tempResume = new ResumeModel({
      userId: req.body.userId, // later replace with req.user._id
      resumeFile: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      originalName: req.file.originalname,
      jobDescription: req.body.jobDescription,
      analysis,
      isTemp: true //mark as temporary
    });
    await tempResume.save();

    res.status(201).json({
      resumeFile: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      originalName: req.file.originalname,
      jobDescription: req.body.jobDescription,
      analysis,  
    });
  } catch (err) {
    console.error("Failed to upload resume", err);
    next(err);
  }
});

export default router;