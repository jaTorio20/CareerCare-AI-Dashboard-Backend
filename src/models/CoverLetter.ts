import mongoose, { Schema, InferSchemaType } from "mongoose";

const CoverLetterSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true 
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

// Updated index to support search filters for jobTitle and companyName
CoverLetterSchema.index({ jobTitle: 1, companyName: 1 });

// Infer TypeScript type directly from schema
export type CoverLetter = InferSchemaType<typeof CoverLetterSchema>;

export const CoverLetterModel = mongoose.model<CoverLetter>("CoverLetter", CoverLetterSchema);