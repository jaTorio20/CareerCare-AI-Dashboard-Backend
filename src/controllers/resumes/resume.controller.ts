import { Request, Response, NextFunction } from "express";
import { ResumeModel } from "../../models/Resume";
import axios from "axios";
import { CreateResumeBody, DeleteResumeParams } from "../../routes/resumes/resume.schema";
import { v2 as cloudinary } from "cloudinary";

// @route     GET /resumes/download/:id
// @description Download resume file
export const downloadResume =
async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const resume = await ResumeModel.findOne({
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
}

// @route     POST /resumes
// @description Create a new resume entry (saved as card)
export const createResume =
async (req: Request <any, any, CreateResumeBody>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.user?._id) return res.status(401).json({ error: "User not found" });

    const { publicId, originalName, analysis } = req.body;

    if (!publicId || !originalName) {
      return res.status(400).json({ error: "resumeFile (Cloudinary publicId + originalName) is required" });
    }

    const tempResume = await ResumeModel.findOne({ publicId, isTemp: true, userId: req.user._id, });
    if (!tempResume) return res.status(404).json({ error: "Temporary resume not found" });
    if (!tempResume.isTemp) return res.status(400).json({ error: "Resume already saved" });
    if (!tempResume?.resumeFile) return res.status(400).json({ error: "Resume file missing" });

    // Save permanent record in DB
      tempResume.isTemp = false;
      tempResume.analysis = analysis;

      await tempResume.save();

      res.status(201).json(tempResume);
  } catch (err) {
    console.error("Failed to save resume", err);
    next(err);
  }
}

// @route GET /resumes
// @description Fetch all resumes for a user
export const getResumes =
async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
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
}

// @route GET /resumes/:id
// @description Fetch a resume by ID
export const getResumeById =
async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const resume = await ResumeModel.findOne({
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
}

// @route DELETE /resumes/:id
// @description Delete a resume by ID
export const deleteResume =
async (req: Request<DeleteResumeParams, any, any>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;

    const resume = await ResumeModel.findById(id);
    if (!resume) {
      res.status(404);
      throw new Error('Resume not found');
    }

    // Check if user owns the Resume
    if (resume.userId && resume.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Unauthorized to delete this resume');
    }

    // Delete file from Cloudinary if publicId is stored
    if (resume.publicId) {
      await cloudinary.uploader.destroy(resume.publicId, { resource_type: "raw" });
    }

    await resume.deleteOne();
    res.status(200).json({ message: 'resume deleted successfully' });
  } catch (err) {   
    next(err);
  }
}