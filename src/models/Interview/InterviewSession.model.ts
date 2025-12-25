import mongoose, { Schema, InferSchemaType } from "mongoose";
import { InterviewMessageModel } from "./InterviewMessage";

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

// Delete all Sessions in InterviewMessageModel that has sessionId 
InterviewSessionSchema.pre("findOneAndDelete", async function () {
  const sessionId = this.getQuery()["_id"];
  if (sessionId) {
    await InterviewMessageModel.deleteMany({ sessionId });
  }
});

export type InterviewSession = InferSchemaType<typeof InterviewSessionSchema>;
export const InterviewSessionModel = mongoose.model<InterviewSession>("InterviewSession", InterviewSessionSchema);
