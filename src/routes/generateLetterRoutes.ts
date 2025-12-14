import express, {  Request, Response, NextFunction } from 'express';
import { generateCoverLetter } from '../services/aiService';
import { CoverLetterModel } from '../models/CoverLetter';
import mongoose from 'mongoose';

const router = express.Router();
// @route          POST /api/cover-letter/generate
// @description    Generate a cover letter based on job description and optional user details
// @access         Public (private in future with auth middleware)
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobDescription, userDetails, jobTitle, companyName } = req.body || {};   
    if (!jobDescription) {
      return res.status(400).json({ error: "jobDescription is required" });
    }
    const coverLetter = await generateCoverLetter(jobDescription, userDetails, jobTitle, companyName);
    res.status(200).json(coverLetter);
  } catch (err) {
    next(err);
  }
});

// @route          POST /api/cover-letter/
// @description    save generated cover letter to DB
// @access         Public (private in future with auth middleware)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try{
  const {  userId, jobDescription, jobTitle, userDetails, companyName, generatedLetter, editedLetter } = req.body || {};

  if (!jobDescription || !generatedLetter) {
    return res.status(400).json({ error: 'jobDescription, and generatedLetter are required' });
  }
  const newCoverLetter = new CoverLetterModel({
    // userId, // later replace with req.user._id
    jobDescription,
    jobTitle,
    companyName,
    userDetails,
    generatedLetter,
    editedLetter
  });
  const savedLetter =  await newCoverLetter.save();
  res.status(201).json(savedLetter);
} catch (err) {
    next(err);
  }
});


// @route          GET /api/cover-letter/
// @description    fetch all cover letters from DB
// @access         Public (private in future with auth middleware)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const letters = await CoverLetterModel.find().sort({ createdAt: -1 }); // userId: req.user._id later for auth
    res.status(200).json(letters);
  } catch (err) {
    next(err);
  }
});


// @route          GET /api/cover-letter/:id
// @description    fetch a specific cover letter by ID
// @access         Public (private in future with auth middleware)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid cover letter ID');
    }

    const coverLetter = await CoverLetterModel.findById(id);
    if (!coverLetter) {
      res.status(404);
      throw new Error('Cover letter not found');
    }
    res.status(200).json(coverLetter);
  } catch (err) {
    next(err);
  }
});


// @route          PUT /api/cover-letter/:id
// @description    update a specific cover letter by ID
// @access         Public (private in future with auth middleware)
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid cover letter ID');
    }

    const coverLetter = await CoverLetterModel.findById(id);
    if (!coverLetter) {
      res.status(404);
      throw new Error('Cover letter not found');
    }

    // Check if user owns the cover letter (to be implemented with auth middleware later)
    // if (coverLetter.userId && coverLetter.userId.toString() !== req.body.userId) {
    //   res.status(403);
    //   throw new Error('Unauthorized to update this cover letter');
    // }
    
    const {jobTitle, companyName, jobDescription, editedLetter } = req.body || {};
   
    if (!jobTitle?.trim() || !companyName?.trim() || !jobDescription ||  !editedLetter){
      res.status(400);
      throw new Error ('Title, summary and description are required')
    }

    coverLetter.jobTitle = jobTitle;
    coverLetter.companyName = companyName;
    coverLetter.jobDescription = jobDescription;
    coverLetter.editedLetter = editedLetter;

    const updatedLetter = await coverLetter.save();
    res.status(200).json(updatedLetter); 
  
  } catch (err) {
    next(err);
  }   
});

// @route          DELETE /api/cover-letter/:id   
// @description    delete a specific cover letter by ID
// @access         Public (private in future with auth middleware)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {      
  try {
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid cover letter ID');
    }

    const coverLetter = await CoverLetterModel.findById(id);
    if (!coverLetter) {
      res.status(404);
      throw new Error('Cover letter not found');
    }

    // Check if user owns the cover letter (to be implemented with auth middleware later)
    // if (coverLetter.userId && coverLetter.userId.toString() !== req.body.userId) {
    //   res.status(403);
    //   throw new Error('Unauthorized to delete this cover letter');
    // }

    await coverLetter.deleteOne();
    res.status(200).json({ message: 'Cover letter deleted successfully' });
  } catch (err) {   
    next(err);
  }
});

export default router;
