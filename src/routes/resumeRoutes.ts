import express, { Request, Response, NextFunction } from "express";
import { ResumeModel } from "../models/Resume";
const router = express.Router();
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { protect } from "../middleware/authMiddleware";
import mongoose from "mongoose";

// @route          GET /api/resumes/:id/download
// @description    Download resume file with original filename
// @access         Private
router.get("/:id/download", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resume = await ResumeModel.findById({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    if (!resume.resumeFile) {
      return res.status(404).json({ error: "Resume file not found" });
    }

    // Force browser to use original filename
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resume.originalName}"`
    );

    // Stream Cloudinary file to client
    const response = await axios.get(resume.resumeFile, { responseType: "stream" });
    response.data.pipe(res);
  } catch (err) {
    console.error("Failed to download resume", err);
    res.status(500).json({ error: "Server error while downloading resume" });
    next(err);
  }
});


// @route          POST /api/resumes
// @description    CREATE a new resume entry (saved as card)
// @access         Private
router.post("/", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Expect JSON body: { userId, resumeFile, jobDescription, analysis }
    const { publicId, originalName, jobDescription, analysis } = req.body;

    if (!publicId || !originalName) {
      return res.status(400).json({ error: "resumeFile (Cloudinary publicId + originalName) is required" });
    }
    const uniqueId = uuidv4();
    // Generate a new permanent publicId
    const newPublicId = `resumes/${uniqueId}_${Date.now()}_${originalName}`;

    // Rename/move the file in Cloudinary
    const renameResult = await cloudinary.uploader.rename(publicId, newPublicId, {
      resource_type: "raw",
      overwrite: false, // prevent accidental overwrite
    });

    // Save permanent record in DB
    const newResume = new ResumeModel({
      userId: req.user._id,
      resumeFile: renameResult.secure_url, // permanent link
      publicId: renameResult.public_id,    // permanent ID
      originalName,
      jobDescription,
      analysis,
      isTemp: false,
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
// @access          Private
router.get("/", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ResumeModel.find({
      userId: req.user._id, 
      isTemp: false
       }).sort({ createdAt: -1 }); //({ userId: req.user._id }).sort({ createdAt: -1 }) later filter by userId: req.user._id
    
    if (!data) {
      return res.status(404).json({ error: "No resumes found" });
    }
    
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resume = await ResumeModel.findById({
      _id: req.params.id,
      userId: req.user._id,
    }); 
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.status(200).json(resume);
  } catch (err) {
    next(err);
  }

});

router.delete("/:id", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid Resume ID');
    }

    const resume = await ResumeModel.findById(id);
    if (!resume) {
      res.status(404);
      throw new Error('Resume not found');
    }

    // Delete file from Cloudinary if publicId is stored
    if (resume.publicId) {
      await cloudinary.uploader.destroy(resume.publicId, { resource_type: "raw" });
    }

    // Check if user owns the Resume
    if (resume.userId && resume.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Unauthorized to delete this resume');
    }

    await resume.deleteOne();
    res.status(200).json({ message: 'resume deleted successfully' });
  } catch (err) {   
    next(err);
  }
});



export default router;
