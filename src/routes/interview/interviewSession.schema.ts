import { z } from "zod";
import mongoose from "mongoose";

// Validate ObjectId
const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid session ID",
  });

// Allowed difficulty and status enums
const difficultyEnum = ["easy", "medium", "hard", "none"] as const;
const statusEnum = ["in-progress", "completed"] as const;

export const createInterviewSessionSchema = z.object({
  body: z.object({
    jobTitle: z.string().min(1, "jobTitle is required"),
    companyName: z.string().min(1, "companyName is required"),
    topic: z.string().optional(),
    difficulty: z.enum(difficultyEnum).optional(), // default
  }),
});

export const createInterviewMessageSchema = z.object({
  params: z.object({
    id: objectId, // sessionId
  }),
  body: z.object({
    text: z.string().optional(), // required if no audio
  }),
});

export const deleteInterviewSessionSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

// Type-safe inference for controller
export type CreateInterviewSessionBody = z.infer<typeof createInterviewSessionSchema>["body"];

export type CreateInterviewMessageBody = z.infer<typeof createInterviewMessageSchema>["body"];
export type CreateInterviewMessageParams = z.infer<typeof createInterviewMessageSchema>["params"];
export type DeleteInterviewSessionParams = z.infer<typeof deleteInterviewSessionSchema>["params"];