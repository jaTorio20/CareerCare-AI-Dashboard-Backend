import express, {Request, Response, NextFunction} from 'express'
import { JobApplicationModel } from '../../models/JobApplication';
import mongoose from 'mongoose';
import { v2 as cloudinary} from 'cloudinary'
import {uploadToCloudinaryJobApplication} from '../../services/cloudinaryService';
import { uploadMiddleware } from '../../middleware/uploadMiddleware';
import axios from "axios";

const router = express.Router();

// @route          GET /api/job-application/:id/download
// @description    Download resume file with original filename
router.get('/:id/download', async (req: Request, res: Response) => {
  const jobApplication = await JobApplicationModel.findById(req.params.id);
  if (!jobApplication) {
    return res.status(404).json({ error: "Application not found" });
  }

  if (!jobApplication.resumeFile) {
    return res.status(404).json({ error: "Resume file not found" });
  }

  // Force browser to use original filename
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${jobApplication.originalName}"`
  );

  // Stream file from Cloudinary to client
  const response = await axios.get(jobApplication.resumeFile, { responseType: "stream" });
  response.data.pipe(res);
});

// @route          POST /api/job-application
// @description    CREATE a new application entry (saved as card)
// @access         Public (later protected by auth)
router.post('/', uploadMiddleware.single("resumeFile"), async (req: Request, res: Response, next: NextFunction) => {
  const { userId, companyName, jobTitle, 
    jobLink, status, location, notes, salaryRange} = req.body || {};

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
  const uploadResult = await uploadToCloudinaryJobApplication(
    req.file.buffer,
    req.file.originalname,
    "resumes/jobApplication"
    
    ); //resumes folder
  
  const jobApplication = new JobApplicationModel({
      // userId, // later replace with req.user._id
      companyName,
      jobTitle,
      jobLink,
      status,
      location,
      notes,
      salaryRange,
      originalName: req.file.originalname,
      resumeFile: uploadResult.secure_url,
      publicId: uploadResult.public_id
  });

  await jobApplication.save();
  res.status(201).json(jobApplication);
});

// @route          POST /api/job-application
// @description    CREATE a new application entry (saved as card)
// @access         Public (later protected by auth)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await JobApplicationModel.find().sort({ createdAt: -1 }); //({ userId: req.user._id }).sort({ createdAt: -1 }) later filter by userId: req.user._id
    
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
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const application = await JobApplicationModel.findById(req.params.id); 
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
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobApplication = await JobApplicationModel.findByIdAndDelete(req.params.id);
    if (!jobApplication) {
      return res.status(404).json({ error: "Job Application Not Found" });
    } 

    // Delete file from Cloudinary if publicId is stored
    if (jobApplication.publicId) {
      await cloudinary.uploader.destroy(jobApplication.publicId, { resource_type: "raw" });
    }

    // Delete document from MongoDB
    await JobApplicationModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Job Application deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// @route          UPDATE /api/job-application/:id   
// @description    update a specific job application by ID
// @access         Public (private in future with auth middleware)
router.put('/:id', async(req: Request, res: Response, next: NextFunction) => {
    try {
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
      // if (coverLetter.userId && coverLetter.userId.toString() !== req.body.userId) {
      //   res.status(403);
      //   throw new Error('Unauthorized to update this cover letter');
      // }
      
      const {companyName, jobTitle, 
            jobLink, status, location, notes, salaryRange,
            resumeFile, resumePublicId } = req.body || {};
            
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
      jobApplication.resumeFile = resumeFile;
      jobApplication.publicId = resumePublicId;
  
      const updatedJobApplication = await jobApplication.save();
      res.status(200).json(updatedJobApplication); 
    
    } catch (err) {
      next(err);
    }   
});

// @route          GET /api/job-application/:id/download
// @description    Download resume file with original filename
// @access         Protected (later with auth)
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
  const jobApplication = await JobApplicationModel.findById(req.params.id);
  if (!jobApplication) {
    return res.status(404).json({ error: "Application not found" });
  }

  // Force browser to use original filename
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${jobApplication.originalName}"`
  );

  if (!jobApplication.resumeFile) {
    return res.status(404).json({ error: "Resume file not found" });
  }

  // Stream file from Cloudinary
  res.redirect(jobApplication.resumeFile);     
  } catch (err) {
    
  }
});


export default router;

