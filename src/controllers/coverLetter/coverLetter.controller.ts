import { Request, Response, NextFunction } from "express";
import { CoverLetterModel } from "../../models/CoverLetter";
import { generateCoverLetter } from "../../services/aiService";
import mongoose from "mongoose";
import {
  GenerateCoverLetterBody,
  SaveCoverLetterBody,
  UpdateCoverLetterParams,
  UpdateCoverLetterBody,
  DeleteCoverLetterParams,
} from "../../routes/coverLetter/coverLetter.schema";

// @route     POST /cover-letter/generate
// @description Generate a cover letter based on job description and optional user details
export const generateLetter = async (
  req: Request<any, any, GenerateCoverLetterBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { jobDescription, userDetails, jobTitle, companyName } = req.body || {};
    if (!jobDescription) {
      return res.status(400).json({ error: "jobDescription is required" });
    }

    const coverLetter = await generateCoverLetter(
      jobDescription,
      userDetails ?? "",
      jobTitle,
      companyName
    );
    res.status(200).json(coverLetter);
  } catch (err) {
    next(err);
  }
};

// @route     POST /cover-letter
// @description Save generated cover letter to DB
export const saveCoverLetter = async (
  req: Request<any, any, SaveCoverLetterBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { jobDescription, jobTitle, userDetails, companyName, generatedLetter, editedLetter } =
      req.body || {};

    if (!jobDescription || !generatedLetter) {
      return res
        .status(400)
        .json({ error: "jobDescription, and generatedLetter are required" });
    }

    const newCoverLetter = new CoverLetterModel({
      userId: req.user._id,
      jobDescription,
      jobTitle,
      companyName,
      userDetails,
      generatedLetter,
      editedLetter,
    });

    const savedLetter = await newCoverLetter.save();
    res.status(201).json(savedLetter);
  } catch (err) {
    next(err);
  }
};

// @route     GET /cover-letter
// @description Fetch all cover letters from DB
export const getCoverLetters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const letters = await CoverLetterModel.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(letters);
  } catch (err) {
    next(err);
  }
};

// @route     GET /cover-letter/:id
// @description Fetch a specific cover letter by ID
export const getCoverLetterById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid cover letter ID");
    }

    const coverLetter = await CoverLetterModel.findById({
      _id: id,
      userId: req.user._id,
    });

    if (!coverLetter) {
      res.status(404);
      throw new Error("Cover letter not found");
    }

    res.status(200).json(coverLetter);
  } catch (err) {
    next(err);
  }
};

// @route     PUT /cover-letter/:id
// @description Update a specific cover letter by ID
export const updateCoverLetter = async (
  req: Request<UpdateCoverLetterParams, any, UpdateCoverLetterBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const coverLetter = await CoverLetterModel.findById(id);
    if (!coverLetter) {
      res.status(404);
      throw new Error("Cover letter not found");
    }

    // Check if user owns the cover letter
    if (coverLetter.userId && coverLetter.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Unauthorized to update this cover letter");
    }

    const { jobTitle, companyName, jobDescription, editedLetter } = req.body || {};

    if (!jobTitle?.trim() || !companyName?.trim() || !jobDescription || !editedLetter) {
      res.status(400);
      throw new Error("Title, summary and description are required");
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
};

// @route     DELETE /cover-letter/:id
// @description Delete a specific cover letter by ID
export const deleteCoverLetter = async (
  req: Request<DeleteCoverLetterParams, any, any>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid cover letter ID");
    }

    const coverLetter = await CoverLetterModel.findById(id);
    if (!coverLetter) {
      res.status(404);
      throw new Error("Cover letter not found");
    }

    // Check if user owns the cover letter
    if (coverLetter.userId && coverLetter.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Unauthorized to delete this cover letter");
    }

    await coverLetter.deleteOne();
    res.status(200).json({ message: "Cover letter deleted successfully" });
  } catch (err) {
    next(err);
  }
};
