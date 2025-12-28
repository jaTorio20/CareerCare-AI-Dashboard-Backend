import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import cors from 'cors'; 
import { errorHandler } from './middleware/errorHandler';

// RESUMES ROUTES IMPORT
import analyzeRoutes from './routes/resumes/analyzeRoutes'
import resumeRoutes from './routes/resumes/resumeRoutes';
import tempRoutes from './routes/resumes/tempRoutes';

// COVER LETTER
import generateLetterRoutes from './routes/coverLetter/generateLetterRoutes';

// JOB APPLICATIONS
import jobApplicationRoutes from './routes/jobApplication/jobApplicationRoutes'

// AUTH
import authRoutes from './routes/auth/authRoutes'
import googleRoutes from './routes/auth/googleOAuth'

// Interview Routes
import interviewSessionRoutes from "./routes/interview/interviewSessionRoutes";

import cookieParser from "cookie-parser";

//NODE CRON AUTO CLEAN UP
import { scheduleCleanupTempResumes } from './cronJobs/cleanupTempResumes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

scheduleCleanupTempResumes();

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