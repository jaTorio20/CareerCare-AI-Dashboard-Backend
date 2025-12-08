import mongoose, { Schema, InferSchemaType } from "mongoose";

const ResumeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  resumeFile: { type: String, required: true },
  jobDescriptionFile: { type: String},
  analysis: {
    atsFriendly: { type: Boolean, default: false },
    atsSuggestions: { type: [String], default: [] },
    jobFitPercentage: { type: Number, min: 0, max: 100 },
    jobFitSuggestions: { type: [String], default: [] },
  },
}, { timestamps: true });

// Infer TypeScript type directly from schema
export type Resume = InferSchemaType<typeof ResumeSchema>;

export type ResumeCreate = Omit<Resume, "createdAt" | "updatedAt">;

// For updates, all fields are optional
export type ResumeUpdate = Partial<Resume>;

export const ResumeModel = mongoose.model<Resume>("Resume", ResumeSchema);
