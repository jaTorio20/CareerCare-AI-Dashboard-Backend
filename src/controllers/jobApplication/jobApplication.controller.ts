import { Request, Response, NextFunction } from "express";
import { JobApplicationModel } from "../../models/jobApplication";
import { ReminderModel } from "../../models/jobApplication";
import { CreateJobApplicationBody, DeleteJobApplicationParams, UpdateJobApplicationBody } from "../../routes/jobApplication/jobApplication.schema";
import { uploadToCloudinaryJobApplication } from "../../services/cloudinaryService";
import { v2 as cloudinary} from 'cloudinary';
import axios from "axios";

// @route          POST /api/job-application
// @description    CREATE a new application entry (saved as card)
/**
 * Controller to create a new job application.
 * Handles file upload to Cloudinary if a resume file is provided.
 * Expects authenticated user information in req.user.
 */
export const createJobApplication =
async (req: Request<any, any, CreateJobApplicationBody>, res: Response, next: NextFunction) => {
  try {
    const { companyName, jobTitle, jobDescription,
      jobLink, status, location, notes, salaryRange} = req.body || {};

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!companyName || !jobTitle){
      return res.status(400).json({ error: "companyName and jobTitle are required" });
    }

    let resumeFile: string | undefined;
    let publicId: string | undefined;
    let originalName: string | undefined;

    if (req.file){
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
      jobDescription,
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
}

// @route          GET /api/job-application
// @description    GET all application entries (saved as cards)
// @access         Private
/**
 * Controller to get all job applications for the authenticated user.
*/
export const getAllJobApplications = 
async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { cursor, limit = 10, search } = req.query as {
      cursor?: string;
      limit?: string;
      search?: string;
    };

    const query: any = { userId: req.user._id };
    if (search) {
      query.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    if (cursor) {
      query._id = { $lt: cursor }; // use Mongo _id for cursor
    }

    const applications = await JobApplicationModel.find(query)
      .sort({ _id: -1 })
      .limit(Number(limit) + 1);

    const hasNext = applications.length > Number(limit);
    const nextCursor = hasNext ? applications[Number(limit)]._id : null;

    res.status(200).json({
      data: applications.slice(0, Number(limit)),
      nextCursor,
    });

  } catch (err) {
    next(err);
  }
}


// @route          GET /api/job-application/:id
// @description    GET a specific application entry (saved as card)
// @access         Private
/**
 * Controller to get a specific job application by ID.
 * Expects authenticated user information in req.user.
*/
export const getJobApplicationById =
async (req: Request, res: Response, next: NextFunction) => {
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
}

// @route          UPDATE /api/job-application/:id   
// @description    update a specific job application by ID
/**
* Controller to update a job application with optional resume file upload.
* Expects authenticated user information in req.user.
*/
export const updateJobApplication =
async(req: Request<any, any, UpdateJobApplicationBody>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
    const { id } = req.params;
    const jobApplication = await JobApplicationModel.findById(id);
    if (!jobApplication) {
      res.status(404);
      throw new Error('Job Application not found');
    }

    if (jobApplication.userId && jobApplication.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Unauthorized to update this Job Application');
    }
    
    const {companyName, jobTitle, 
          jobLink, jobDescription, status, location, notes, salaryRange} = req.body || {};
          
    if (!jobTitle?.trim() || !companyName?.trim() ){
      res.status(400);
      throw new Error ('Job Title and Company Name are required')
    }

    jobApplication.companyName = companyName;
    jobApplication.jobTitle = jobTitle;
    if (jobLink !== undefined) jobApplication.jobLink = jobLink;
    if (jobDescription !== undefined) jobApplication.jobDescription = jobDescription;
    if (status !== undefined) jobApplication.status = status;
    if (location !== undefined) jobApplication.location = location;
    if (notes !== undefined) jobApplication.notes = notes;
    if (salaryRange !== undefined) jobApplication.salaryRange = salaryRange;

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
}

// @route          DELETE /api/job-application/:id   
// @description    delete a specific job application by ID
/**
 * Controller to delete a job application by ID.
 * Also deletes the associated resume file from Cloudinary if it exists.  
 * Expects authenticated user information in req.user.
*/
export const deleteJobApplication =
  async (req: Request<DeleteJobApplicationParams, any, any>, res: Response, next: NextFunction) => {
  try {

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const jobApplication = await JobApplicationModel.findById(id);
    if(!jobApplication){
      res.status(404);
      throw new Error('Job application not found');
    }

    if(jobApplication.userId.toString() !== req.user._id.toString()){
      res.status(403);
      throw new Error('Not authorized to delete this Job Application')
    };

    if (jobApplication.publicId) {
      await cloudinary.uploader.destroy(jobApplication.publicId, { resource_type: "raw" });
    }

    // Delete associated reminders
    await ReminderModel.deleteMany({ applicationId: id });

    await jobApplication.deleteOne();

    res.status(200).json({ message: "Job Application and associated reminders deleted successfully" });
  } catch (err) {
    next(err);
  }
}

// @route          GET /api/job-application/:id/download
// @description    Download resume file with original filename
/**
 * Controller to download the resume file for a specific job application.
 * Expects authenticated user information in req.user.  
 * Sends the file as an attachment with the original filename.
*/
export const downloadResumeFile =
async (req: Request, res: Response, next: NextFunction) => {
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
    next(err);
  }
}