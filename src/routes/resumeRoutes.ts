import express, { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ResumeModel, ResumeCreate } from '../models/Resume';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import {uploadToCloudinary} from '../services/cloudinaryService';
import { parseFile } from '../services/fileService';

const router = express.Router();

// @route          POST /api/resumes
// @desccription   CREATE a new resume entry
// @access          Public
router.post("/", uploadMiddleware.single("resumeFile"),
 async (req: Request, res: Response, next: NextFunction) => {
  try {
      // if (!req.body.userId || !req.file) {
      if (!req.body.userId || !req.file) {
        return res.status(400).json({ error: "userId and resumeFile are required" });
      }

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(req.file.buffer);

      // Parse file (you can use req.file.buffer or Cloudinary URL)
      const resumeText = await parseFile(req.file);
      // Run AI analysis
      const analysis = await analyzeResume(resumeText, req.body.jobDescriptionFile);

      const newResume = new ResumeModel({
        userId: req.body.userId,
        resumeFile: uploadResult?.secure_url, //store Cloudinary URL
        jobDescriptionFile: req.body.jobDescriptionFile,
        analysis: analysis,
      });

        await newResume.save();
        res.status(201).json(newResume);
  } catch (err) {
    console.error("Failed to upload resume", err);
    next(err);
  }
});

export default router;