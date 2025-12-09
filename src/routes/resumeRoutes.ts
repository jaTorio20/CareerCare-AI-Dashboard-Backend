import express, { Request, Response, NextFunction } from "express";
import { ResumeModel } from "../models/Resume";
import { uploadMiddleware } from "../middleware/uploadMiddleware";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { parseFile } from "../services/fileService";
import { analyzeResume } from "../services/aiService";
const router = express.Router();


// @route          POST /api/resumes
// @description    CREATE a new resume entry (saved as card)
// @access         Public (later protected by auth)
router.post("/", uploadMiddleware.single("resumeFile"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "resumeFile is required" });
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
      const uploadResult = await uploadToCloudinary(req.file.buffer);

      // Parse file
      const resumeText = await parseFile(req.file);

      // Run AI analysis
      const analysis = await analyzeResume(resumeText, req.body.jobDescription);

      // Save to DB to makes it a card later on
      const newResume = new ResumeModel({
        userId: req.body.userId, // later replace with req.user._id
        resumeFile: uploadResult?.secure_url,
        jobDescription: req.body.jobDescription,
        analysis: analysis,
      });

      await newResume.save();
      res.status(201).json(newResume);
    } catch (err) {
      console.error("Failed to upload resume", err);
      next(err);
    }
  }
);

export default router;
