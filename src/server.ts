import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import cors from 'cors'; 
import { errorHandler } from './middleware/errorHandler';
import analyzeRoutes from './routes/analyzeRoutes';
import resumeRoutes from './routes/resumeRoutes';
import tempRoutes from './routes/tempRoutes';
import generateLetterRoutes from './routes/generateLetterRoutes';
import jobApplicationRoutes from './routes/jobApplication/jobApplicationRoutes'
import authRoutes from './routes/auth/authRoutes'
import googleRoutes from './routes/auth/googleOAuth'

// Interview Routes
import interviewSessionRoutes from "./routes/interview/interviewSessionRoutes";
// import interviewMessageRoutes from "./routes/interview/interviewMessageRoutes"

import cookieParser from "cookie-parser";
//NODE CRON AUTO DELETE
import cron from "node-cron";
import { v2 as cloudinary } from "cloudinary";
import { ResumeModel } from './models/Resume';

// Run every hour
 cron.schedule("0 0 * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Find temp resumes older than cutoff
    const oldTemps = await ResumeModel.find({
      createdAt: { $lt: cutoff },
      isTemp: true
    });

    for (const resume of oldTemps) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(resume.publicId, { resource_type: "raw" });
      // Delete from MongoDB
      await ResumeModel.deleteOne({ _id: resume._id });
    }

    console.log(`Cleaned up ${oldTemps.length} temp resumes`);
  } catch (err) {
    console.error("Error cleaning temp resumes:", err);
  }
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

app.use(cookieParser());
// CORS Configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || `http://localhost:3000`, // Adjust as needed
  credentials: true, //for allowing to send header value
  exposedHeaders: ["Content-Disposition"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleRoutes);

// RESUMES
app.use('/api/resumes', resumeRoutes);
app.use('/api/resumes/temp', tempRoutes);
app.use('/api/resumes/analyze', analyzeRoutes);

//COVER LETTER
app.use('/api/cover-letter', generateLetterRoutes);

//JOB APPLICATION
app.use('/api/job-application', jobApplicationRoutes);

// INTERVIEW
app.use("/api/interview", interviewSessionRoutes);
// app.use("/api/interview", interviewMessageRoutes);

//404 Fallback
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
})

app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 