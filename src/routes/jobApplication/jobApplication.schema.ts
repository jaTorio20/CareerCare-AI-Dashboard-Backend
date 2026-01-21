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
    companyName: z.string()
    .min(1, "companyName is required")
    .max(255, "companyName must not exceed 255 characters"),
    jobTitle: z.string()
    .min(1, "jobTitle is required")
    .max(255, "jobTitle must not exceed 255 characters"),
    jobLink: z.url("jobLink must be a valid URL")
    .max(2048, "jobLink must not exceed 2048 characters")
    .optional(),
    jobDescription: z.string().max(4000, "Job description cannot exceed 4000 characters").optional(),
    status: z.enum(statusEnum).default('applied'),
    location: z.enum(locationEnum).default('remote'),
    notes: z.string()
    .max(4000, "Notes must not exceed 4000 characters")
    .optional(),
    salaryRange: z.string()
    .max(255, "Salary range must not exceed 255 characters")
    .optional(),
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
    companyName: z.string()
    .min(1, "companyName is required")
    .max(255, "companyName must not exceed 255 characters"),
    jobTitle: z.string()
    .min(1, "jobTitle is required")
    .max(255, "jobTitle must not exceed 255 characters"),
    jobLink: z.url("jobLink must be a valid URL")
    .max(2048, "jobLink must not exceed 2048 characters")
    .optional(),
    jobDescription: z.string().max(4000, "Job description cannot exceed 4000 characters").optional(),
    status: z.enum(statusEnum).default('applied'),
    location: z.enum(locationEnum).default('remote'),
    notes: z.string().max(4000, "Notes must not exceed 4000 characters").optional(),
    salaryRange: z.string().optional(),
  }),
});

// @Controller Types
export type CreateJobApplicationBody = z.infer<typeof createJobApplicationSchema>["body"];
export type UpdateJobApplicationBody = z.infer<typeof updateJobApplicationSchema>["body"];
export type DeleteJobApplicationParams = z.infer<typeof deleteJobApplicationSchema>["params"];
