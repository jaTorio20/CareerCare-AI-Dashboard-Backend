import mongoose, { Schema, InferSchemaType } from "mongoose";

const InterviewMessageSchema = new Schema({
  // AI providing questions
  sessionId: { 
    type: Schema.Types.ObjectId, 
    ref: "InterviewSession", 
    required: true 
  },
  role: { type: String, enum: ["user", "ai"] }, // who sent it
  text: String,          // message content
  audioUrl: String,      // optional if voice recorded
  transcriptionConfidence: Number,
  createdAt: Date,
}, { timestamps: true });

export type InterviewMessage = InferSchemaType<typeof InterviewMessageSchema>;
export const InterviewMessageModel = mongoose.model<InterviewMessage>("InterviewMessage", InterviewMessageSchema);
