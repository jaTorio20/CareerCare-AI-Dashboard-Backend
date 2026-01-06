import { z } from "zod";
import mongoose from "mongoose";

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid resume id",
  });

export const createResumeSchema = z.object({
  body: z.object({
    publicId: z.string().min(1, "Cloudinary publicId is required"),
    originalName: z.string().min(1, "Original resume file name is required"),
    jobId: z.string().optional(), 
    jobDescription: z.string().optional(),
    analysis: z
      .object({
        atsFriendly: z.boolean().optional(),
        atsSuggestions: z.array(z.string()).optional(),
        jobFitPercentage: z.number().min(0).max(100).optional(),
        jobFitSuggestions: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});

export const deleteResumeSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

export const uploadResumeSchema = z.object({
  body: z.object({
    jobDescription: z.string().optional(), // optional field
  }),
});

export type CreateResumeBody = z.infer<typeof createResumeSchema>["body"];
export type UploadResumeBody = z.infer<typeof uploadResumeSchema>["body"];
export type DeleteResumeParams = z.infer<typeof deleteResumeSchema>["params"];