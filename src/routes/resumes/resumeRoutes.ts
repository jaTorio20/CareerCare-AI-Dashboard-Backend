import express, { Request, Response, NextFunction } from "express";
import { ResumeModel } from "../../models/Resume";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import { protect } from "../../middleware/authMiddleware";

//VALIDATION
import { validate } from "../../middleware/validate";
import { createResumeSchema, deleteResumeSchema } from "./resume.schema";
import { CreateResumeBody, DeleteResumeParams } from "./resume.schema";

const router = express.Router();

// @route          GET /api/resumes/temp
// @description    Fetch latest temp resume with analysis
// @access         Private
router.get("/temp", protect, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: "jobId is required" });
    }

    const tempResume = await ResumeModel.findOne({
      userId: req.user._id,
      jobId,
      isTemp: true,
    }).sort({ createdAt: -1 });

    if (!tempResume) {
      return res.status(404).json({ message: "No temp resume found" });
    }

    res.json({
      resumeFile: tempResume.resumeFile,
      publicId: tempResume.publicId,
      originalName: tempResume.originalName,
      jobDescription: tempResume.jobDescription,
      analysis: tempResume.analysis,
    });
  } catch (err) {
    console.error("Failed to fetch temp resume", err);
    res.status(500).json({ error: "Failed to fetch temp resume" });
  }
});

// @route          GET /api/resumes/:id/download
// @description    Download resume file with original filename
// @access         Private
router.get("/:id/download", protect, async (req: Request, res: Response, next: NextFunction) => {
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
});


// @route          POST /api/resumes
// @description    CREATE a new resume entry (saved as card)
// @access         Private
router.post("/", protect, 
  validate(createResumeSchema), 
async (req: Request <any, any, CreateResumeBody>, res: Response, next: NextFunction) => {
 
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { publicId, originalName, jobDescription, analysis, jobId } = req.body;

    if (!publicId || !originalName) {
      return res.status(400).json({ error: "resumeFile (Cloudinary publicId + originalName) is required" });
    }

    const tempResume = await ResumeModel.findOne({ publicId: req.body.publicId, isTemp: true });
    if (!tempResume) return res.status(404).json({ error: "Temporary resume not found" });

    if (!req.user?._id) return res.status(401).json({ error: "User not found" });
    if (!tempResume?.resumeFile) return res.status(400).json({ error: "Resume file missing" });

    // Save permanent record in DB
    const newResume = new ResumeModel({
      userId: req.user._id,
      jobId,
      resumeFile: tempResume.resumeFile,
      publicId: tempResume.publicId,
      originalName,
      jobDescription,
      analysis,
      isTemp: false,
    });
 try {
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
});

router.get("/:id", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
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

router.delete("/:id", protect, validate(deleteResumeSchema), 
async (req: Request<DeleteResumeParams, any, any>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    // if(!mongoose.Types.ObjectId.isValid(id)) {
    //   res.status(400);
    //   throw new Error('Invalid Resume ID');
    // }

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
});



export default router;
