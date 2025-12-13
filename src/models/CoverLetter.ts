import mongoose, { Schema, InferSchemaType } from "mongoose";

const CoverLetterSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false // false for now, can be true if needed later
  },
  jobTitle: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  
  jobDescription: { 
    type: String,
    required: true 
  },
  userDetails: { 
    type: String,
    required: false,
  },
  generatedLetter: { 
    type: String,
    required: true 
  },
  editedLetter: { 
    type: String,
    required: false 
  },
}, { timestamps: true });

// Infer TypeScript type directly from schema
export type CoverLetter = InferSchemaType<typeof CoverLetterSchema>;

export const CoverLetterModel = mongoose.model<CoverLetter>("CoverLetter", CoverLetterSchema);