import { z } from "zod";
import mongoose from "mongoose";

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid Job Application ID",
  });

// Status options
const statusEnum = ['applied', 'interview', 'offer', 'rejected', 'accepted'] as const;

// Location options
const locationEnum = ['remote', 'onsite', 'hybrid'] as const;

export const createJobApplicationSchema = z.object({
  body: z.object({
    companyName: z.string().min(1, "companyName is required"),
    jobTitle: z.string().min(1, "jobTitle is required"),
    jobLink: z.url("jobLink must be a valid URL").optional(),
    jobDescription: z.string().max(4000, "Job description cannot exceed 4000 characters").optional(),
    status: z.enum(statusEnum).optional(),
    location: z.enum(locationEnum).optional(),
    notes: z.string().optional(),
    salaryRange: z.string().optional(),
  }),
});

export const deleteJobApplicationSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

export const updateJobApplicationSchema = z.object({
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    companyName: z.string().min(1, "companyName is required").optional(),
    jobTitle: z.string().min(1, "jobTitle is required").optional(),
    jobLink: z.url("jobLink must be a valid URL").optional(),
    jobDescription: z.string().max(4000, "Job description cannot exceed 4000 characters").optional(),
    status: z.enum(statusEnum).optional(),
    location: z.enum(locationEnum).optional(),
    notes: z.string().optional(),
    salaryRange: z.string().optional(),
  }),
});

export type CreateJobApplicationBody = z.infer<typeof createJobApplicationSchema>["body"];
export type UpdateJobApplicationBody = z.infer<typeof updateJobApplicationSchema>["body"];
export type DeleteJobApplicationParams = z.infer<typeof deleteJobApplicationSchema>["params"];
