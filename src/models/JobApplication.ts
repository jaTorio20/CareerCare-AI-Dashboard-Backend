import mongoose, {InferSchemaType, Schema} from "mongoose";

const JobApplicationSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
  },
  companyName: {
    type: String, 
    required: true 
  },
  jobTitle: { 
    type: String, 
    required: true 
  },
  jobLink: { 
    type: String 
  },
  jobDescription: {
    type: String,
    maxlength: 2000, 
  },
  status: { 
    type: String, 
    enum: ['applied', 'interview', 'offer', 'rejected', 'accepted'], 
    default: 'applied' 
  },
  location: { 
    type: String,
    enum: ['remote', 'onsite', 'hybrid'],
    default: 'remote',
  },
  notes: {
    type: String 
  },
  salaryRange: {
    type: String 
  },
  
  originalName:{
    type: String,
    required: false,
  },
  resumeFile: { 
    type: String, 
    required: false 
  },     // Cloudinary URL or file path
  publicId: { 
    type: String, 
    required: false 
  }, // Cloudinary publicId

}, { timestamps: true });

export type JobApplication = InferSchemaType<typeof JobApplicationSchema>;

export const JobApplicationModel = mongoose.model<JobApplication>("JobApplication", JobApplicationSchema);