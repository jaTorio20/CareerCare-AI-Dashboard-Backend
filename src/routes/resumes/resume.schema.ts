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
    jobDescription: z.string().max(4000, "Job description cannot exceed 4000 characters").optional(),

    analysis: z.object({
      atsScore: z.number().min(0).max(100).optional(),

      formatIssues: z.array(z.string()),

      keywordMatchPercentage: z.number().min(0).max(100).optional(),

      missingKeywords: z.array(z.string()).optional(),

      strengthKeywords: z.array(z.string()).optional(),

      improvementSuggestions: z.array(
        z.object({
          priority: z.enum(["high", "medium", "low"]),
          message: z.string().min(1),
        })
      ),
    }),
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

// Type Exports Controllers
export type CreateResumeBody = z.infer<typeof createResumeSchema>["body"];
export type UploadResumeBody = z.infer<typeof uploadResumeSchema>["body"];
export type DeleteResumeParams = z.infer<typeof deleteResumeSchema>["params"];