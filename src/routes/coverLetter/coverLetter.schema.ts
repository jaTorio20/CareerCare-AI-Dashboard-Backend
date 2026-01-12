import { z } from "zod";
import mongoose from "mongoose";

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid cover letter ID",
  });

export const generateCoverLetterSchema = z.object({
  body: z.object({
    jobDescription: z
    .string()
    .min(1, "jobDescription is required")
    .max(4000, "jobDescription must not exceed 4000 characters"),
    jobTitle: z.string().min(1, "jobTitle is required"),
    companyName: z.string().min(1, "companyName is required"),
    userDetails: z.string().optional(),
  }),
});

export const saveCoverLetterSchema = z.object({
  body: z.object({
    jobDescription: z.string().min(1, "jobDescription is required"),
    jobTitle: z.string().optional(),
    companyName: z.string().optional(),
    userDetails: z.string().optional(),
    generatedLetter: z.string().min(1, "generatedLetter is required"),
    editedLetter: z.string().optional(),
  }),
});

export const updateCoverLetterSchema = z.object({
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    jobTitle: z.string().min(1, "jobTitle is required"),
    companyName: z.string().min(1, "companyName is required"),
    jobDescription: z
    .string()
    .min(1, "jobDescription is required")
    .max(4000, "jobDescription must not exceed 4000 characters"),
    editedLetter: z.string().min(1, "editedLetter is required"),
  }),
});

export const deleteCoverLetterSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

export type GenerateCoverLetterBody = z.infer<typeof generateCoverLetterSchema>["body"];

export type SaveCoverLetterBody = z.infer<typeof saveCoverLetterSchema>["body"];

export type UpdateCoverLetterParams = z.infer<typeof updateCoverLetterSchema>["params"];
export type UpdateCoverLetterBody = z.infer<typeof updateCoverLetterSchema>["body"];

export type DeleteCoverLetterParams = z.infer<typeof deleteCoverLetterSchema>["params"];