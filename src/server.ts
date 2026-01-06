import logger from "./utils/logger";
import { httpLogger } from "./middleware/loggerMiddleware";

import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import cors from 'cors'; 
import { errorHandler } from './middleware/errorHandler';
import helmet from 'helmet';
import compression from "compression";
import hpp from "hpp";
import mongoose from "mongoose";

// BACKGROUND WORKER
import { startWorker } from "./background/workers/background.worker";

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


// --------- CRASH HANDLERS -----------
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "UNHANDLED REJECTION");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "UNCAUGHT EXCEPTION");
  process.exit(1);
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database and resume clean up
// connectDB();
// scheduleCleanupTempResumes();

//  --------- MIDDLEWARE -----------
app.use(helmet());// Security headers
app.use(compression());// Compression for all responses
app.use(hpp()); // protect query params

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || `http://localhost:3000`, // Adjust as needed
  credentials: true, //for allowing to send header value
  exposedHeaders: ["Content-Disposition"],
}));

app.use(httpLogger);

app.get("/", async (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbStatus = dbStates[mongoose.connection.readyState];

  logger.info({ route: "/", dbStatus, uptime: process.uptime() }, "Health check requested");

  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});


// AUTH
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


async function bootstrap() {
  await connectDB();

  if (process.env.START_WORKER === "true") {
    await startWorker();
    logger.info("Background worker started");
  }

  scheduleCleanupTempResumes();

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
});
