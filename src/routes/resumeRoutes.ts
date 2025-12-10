import express, { Request, Response, NextFunction } from "express";
import { ResumeModel } from "../models/Resume";
// import { uploadMiddleware } from "../middleware/uploadMiddleware";
// import { uploadToCloudinary } from "../services/cloudinaryService";
// import { parseFile } from "../services/fileService";
// import { analyzeResume } from "../services/aiService";
const router = express.Router();


// @route          POST /api/resumes
// @description    CREATE a new resume entry (saved as card)
// @access         Public (later protected by auth)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Expect JSON body: { userId, resumeFile, jobDescription, analysis }
    const { userId, resumeFile, jobDescription, analysis } = req.body;

    if (!resumeFile) {
      return res.status(400).json({ error: "resumeFile (Cloudinary URL) is required" });
    }

    const newResume = new ResumeModel({
      // userId, // later replace with req.user._id
      resumeFile, // Cloudinary URL string
      jobDescription,
      analysis,
    });

    await newResume.save();
    res.status(201).json(newResume);
  } catch (err) {
    console.error("Failed to save resume", err);
    next(err);
  }
});

// @route          GET /api/resumes
// @description    fetch all resumes for a user
// @access         Public (later protected by auth)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ResumeModel.find().sort({ createdAt: -1 }); //({ userId: req.user._id }).sort({ createdAt: -1 }) later filter by userId: req.user._id
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});



export default router;
