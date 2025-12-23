import express, {Request, Response, NextFunction} from 'express'
import { JobApplicationModel } from '../../models/JobApplication';
import mongoose from 'mongoose';
import { v2 as cloudinary} from 'cloudinary'
import {uploadToCloudinaryJobApplication} from '../../services/cloudinaryService';
import { uploadMiddleware } from '../../middleware/uploadMiddleware';
import axios from "axios";
import { protect } from '../../middleware/authMiddleware';

const router = express.Router();

// @route          POST /api/job-application
// @description    CREATE a new application entry (saved as card)
// @access         Public (later protected by auth)
router.post('/', protect, uploadMiddleware.single("resumeFile"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyName, jobTitle, 
      jobLink, status, location, notes, salaryRange} = req.body || {};

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // if (!req.body.userId) {
 
    if (!companyName && !jobTitle){
      return res.status(400).json({ error: "companyName and jobTitle are required" });
    }

    let resumeFile: string | undefined;
    let publicId: string | undefined;
    let originalName: string | undefined;

    if (req.file){
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Unsupported file type" });
      }
            // Upload to Cloudinary only if file exists
      const uploadResult = await uploadToCloudinaryJobApplication(
        req.file.buffer,
        req.file.originalname,
        "resumes/jobApplication"
      );

      resumeFile = uploadResult.secure_url;
      publicId = uploadResult.public_id;
      originalName = req.file.originalname;
    }

  
  const jobApplication = new JobApplicationModel({
      userId: req.user._id,
      companyName,
      jobTitle,
      jobLink,
      status,
      location,
      notes,
      salaryRange,
      originalName,
      resumeFile: resumeFile,
      publicId,
  });

  await jobApplication.save();
  res.status(201).json(jobApplication);
  } catch (err) {
    next(err)
  }
});

// @route          POST /api/job-application
// @description    CREATE a new application entry (saved as card)
// @access         Public (later protected by auth)
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const data = await JobApplicationModel.find({
      userId: req.user._id, 
    }).sort({ createdAt: -1 }); //({ userId: req.user._id }).sort({ createdAt: -1 }) later filter by userId: req.user._id
    
    if (!data) {
      return res.status(404).json({ error: "No Applications found" });
    }
    
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// @route          POST /api/job-application/:id
// @description    CREATE a new application entry (saved as card)
// @access         Public (later protected by auth)
router.get('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const application = await JobApplicationModel.findById({
      _id: req.params.id,
      userId: req.user._id,
    }); 
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.status(200).json(application);
  } catch (err) {
    next(err);
  }
});

// @route          DELETE /api/job-application/:id   
// @description    delete a specific job application by ID
// @access         Public (private in future with auth middleware)
router.delete("/:id", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){ //if certain length in ID is missing will result idea not found
      res.status(404);
      throw new Error('Application Not Found')      
    }

    const jobApplication = await JobApplicationModel.findById(id);
    if(!jobApplication){
      res.status(404);
      throw new Error('Job application not found');
    }

    // Check if user owns Job Application
    if(jobApplication.userId.toString() !== req.user._id.toString()){
      res.status(403);
      throw new Error('Not authorized to delete this Job Application')
    };

    // Delete file from Cloudinary if publicId is stored
    if (jobApplication.publicId) {
      await cloudinary.uploader.destroy(jobApplication.publicId, { resource_type: "raw" });
    }

    // Delete document from MongoDB
    await jobApplication.deleteOne();

    res.status(200).json({ message: "Job Application deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// @route          UPDATE /api/job-application/:id   
// @description    update a specific job application by ID
// @access         Public (private in future with auth middleware)
router.put('/:id', protect, uploadMiddleware.single("resumeFile"), async(req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

      const { id } = req.params;
  
      if(!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error('Invalid Job Application ID');
      }
  
      const jobApplication = await JobApplicationModel.findById(id);
      if (!jobApplication) {
        res.status(404);
        throw new Error('Job Application not found');
      }
  
      // Check if user owns the cover letter (to be implemented with auth middleware later)
      if (jobApplication.userId && jobApplication.userId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Unauthorized to update this Job Application');
      }
      
      const {companyName, jobTitle, 
            jobLink, status, location, notes, salaryRange} = req.body || {};
            
      if (!jobTitle?.trim() || !companyName?.trim() ){
        res.status(400);
        throw new Error ('Job Title and Company Name are required')
      }
  
      jobApplication.companyName = companyName;
      jobApplication.jobTitle = jobTitle;
      jobApplication.jobLink = jobLink;
      jobApplication.status = status;
      jobApplication.location = location;
      jobApplication.notes = notes;
      jobApplication.salaryRange = salaryRange;
  
    // Handle resume update if a new file is uploaded
      if (req.file) {
        // Delete old file if exists
        if (jobApplication.publicId) {
          await cloudinary.uploader.destroy(jobApplication.publicId, {
            resource_type: "raw",
          });
        }

        // Upload new file to Cloudinary
        const uploadResult = await uploadToCloudinaryJobApplication(
          req.file.buffer,
          req.file.originalname,
          "resumes/jobApplication"
        );

        jobApplication.resumeFile = uploadResult.secure_url;
        jobApplication.publicId = uploadResult.public_id;
        jobApplication.originalName = req.file.originalname;
      }

      const updatedJobApplication = await jobApplication.save();
      res.status(200).json(updatedJobApplication);
    } catch (err) {
      next(err);
    }   
});

// @route          GET /api/job-application/:id/download
// @description    Download resume file with original filename
// @access         Protected (later with auth)
router.get("/:id/download", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const jobApplication = await JobApplicationModel.findById(req.params.id);
    if (!jobApplication) {
      return res.status(404).json({ error: "Resume not found" });
    }

    if (!jobApplication.resumeFile) {
      return res.status(404).json({ error: "Resume file not found" });
    }

    // Ownership check
    if (jobApplication.userId.toString() !== req.user._id.toString() ) {
      res.status(403);
      throw new Error("Not authorized to download this resume");
    }

    // Force browser to use original filename
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${jobApplication.originalName}"`
    );

    // Stream Cloudinary file to client
    const response = await axios.get(jobApplication.resumeFile, { responseType: "stream" });
    response.data.pipe(res);
  } catch (err) {
    // console.error("Failed to download resume", err);
    // res.status(500).json({ error: "Server error while downloading resume" });
    next(err);
  }
});

export default router;

