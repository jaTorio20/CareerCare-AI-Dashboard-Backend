import mongoose, { Schema, InferSchemaType } from "mongoose";

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
    required: false 
  },
  originalName: {
     type: String, 
     required: true 
  }, 
  analysis: {
    atsFriendly: { 
      type: Boolean,
      default: false 
    },
    atsSuggestions: { 
      type: [String], 
      default: [] 
    },
    jobFitPercentage: {
      type: Number, 
      min: 0, 
      max: 100 
    },
    jobFitSuggestions: { 
      type: [String], 
      default: [] 
    },
  },
  isTemp: { type: Boolean, default: true }
}, { timestamps: true });

// Infer TypeScript type directly from schema
export type Resume = InferSchemaType<typeof ResumeSchema>;

// // For updates, all fields are optional
// export type ResumeUpdate = Partial<Resume>;

export const ResumeModel = mongoose.model<Resume>("Resume", ResumeSchema);
