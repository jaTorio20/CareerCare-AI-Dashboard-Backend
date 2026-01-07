import mongoose, { Schema, InferSchemaType } from "mongoose";

const AnalysisSchema = new Schema({
  atsScore: { type: Number, min: 0, max: 100 },
  formatIssues: { type: [String], default: [] },
  keywordMatchPercentage: { type: Number, min: 0, max: 100 },
  missingKeywords: { type: [String], default: [] },
  strengthKeywords: { type: [String], default: [] },
  improvementSuggestions: {
    type: [
      {
        _id: false,
        priority: { type: String, enum: ["high", "medium", "low"], required: true },
        message: { type: String, required: true },
      },
    ],
    default: [],
  },
});

const ResumeSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
  },
  jobId: { 
    type: String, 
    required: false, 
    index: true 
  },
  resumeFile: { type: String, 
    required: true 
  },
  publicId: {
    type: String,
    required: true
  },  
  jobDescription: { 
    type: String,
    required: false,
    maxlength: 2000, 
  },
  originalName: {
     type: String, 
     required: true 
  }, 
  analysis: { type: AnalysisSchema, default: {},  _id: false },
  isTemp: { type: Boolean, default: true }
}, { timestamps: true });


export type Resume = InferSchemaType<typeof ResumeSchema>;

export const ResumeModel = mongoose.models.Resume || mongoose.model<Resume>("Resume", ResumeSchema);

