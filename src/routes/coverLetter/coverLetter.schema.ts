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
    jobTitle: z.string()
    .min(1, "jobTitle is required")
    .max(255, "jobTitle must not exceed 255 characters"),
    companyName: z.string()
    .min(1, "companyName is required")
    .max(255, "companyName must not exceed 255 characters"),
    userDetails: z.string()
    .max(2000, "userDetails must not exceed 2000 characters")
    .optional()
  }),
});

export const saveCoverLetterSchema = z.object({
  body: z.object({
    jobDescription: z.string().min(1, "jobDescription is required")
    .max(4000, "jobDescription must not exceed 4000 characters"),
    jobTitle: z.string()
    .min(1, "jobTitle is required")
    .max(255, "jobTitle must not exceed 255 characters")
    .optional(),
    companyName: z.string()
    .min(1, "companyName is required")
    .max(255, "companyName must not exceed 255 characters")
    .optional(),
    userDetails: z.string()
    .max(2000, "userDetails must not exceed 2000 characters")
    .optional(),
    generatedLetter: z.string().min(1, "generatedLetter is required"),
    editedLetter: z.string().optional(),
  }),
});

export const updateCoverLetterSchema = z.object({
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    jobTitle: z.string()
    .min(1, "jobTitle is required")
    .max(255, "jobTitle must not exceed 255 characters"),
    companyName: z.string()
    .min(1, "companyName is required")
    .max(255, "companyName must not exceed 255 characters"),
    jobDescription: z.string()
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