import express, { Request, Response, NextFunction } from "express";
import { ResumeModel } from "../models/Resume";
const router = express.Router();
import { v2 as cloudinary } from "cloudinary";


// @route          POST /api/resumes
// @description    CREATE a new resume entry (saved as card)
// @access         Public (later protected by auth)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Expect JSON body: { userId, resumeFile, jobDescription, analysis }
    const { userId, resumeFile, publicId, isTemp, jobDescription, analysis } = req.body;

    if (!resumeFile) {
      return res.status(400).json({ error: "resumeFile (Cloudinary URL) is required" });
    }

    const newResume = new ResumeModel({
      // userId, // later replace with req.user._id
      resumeFile, // Cloudinary URL string
      publicId,
      isTemp,  
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
    const data = await ResumeModel.find({ isTemp: false }).sort({ createdAt: -1 }); //({ userId: req.user._id }).sort({ createdAt: -1 }) later filter by userId: req.user._id
    
    if (!data) {
      return res.status(404).json({ error: "No resumes found" });
    }
    
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resume = await ResumeModel.findById(req.params.id); 
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.status(200).json(resume);
  } catch (err) {
    next(err);
  }

});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resume = await ResumeModel.findByIdAndDelete(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    } 

    // Delete file from Cloudinary if publicId is stored
    if (resume.publicId) {
      await cloudinary.uploader.destroy(resume.publicId, { resource_type: "raw" });
    }

    // Delete document from MongoDB
    await ResumeModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
