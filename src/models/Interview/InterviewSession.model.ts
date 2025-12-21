import mongoose, { Schema, InferSchemaType } from "mongoose";

const InterviewSessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  jobTitle: String,
  companyName: String,
  topic: String,
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard", "none"],
    default: "none"
  },
  status: { type: String, enum: ["in-progress", "completed"], default: "in-progress" },
  startedAt: Date,
  endedAt: Date,
}, { timestamps: true });

export type InterviewSession = InferSchemaType<typeof InterviewSessionSchema>;
export const InterviewSessionModel = mongoose.model<InterviewSession>("InterviewSession", InterviewSessionSchema);
