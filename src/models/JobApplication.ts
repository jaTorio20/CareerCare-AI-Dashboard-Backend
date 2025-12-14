import mongoose, {InferSchemaType, Schema} from "mongoose";

const JobApplicationSchema = new Schema({
  companyName: {
    type: String, 
    required: true 
  },
  jobTitle: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['applied','interview','offer','rejected','accepted'], 
    default: 'applied' 
  },
  resumeFile: { 
    type: String, 
    required: true 
  },     // Cloudinary URL or file path
  resumePublicId: { 
    type: String, 
    required: true 
  }, // Cloudinary publicId
  notes: {
     type: String 
  },
}, { timestamps: true });

export type JobApplication = InferSchemaType<typeof JobApplicationSchema>;

export const JobApplicationModel = mongoose.model<JobApplication>("JobApplication", JobApplicationSchema);