import express from "express";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import { httpLogger } from "./middleware/loggerMiddleware";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth/authRoutes";
import googleRoutes from "./routes/auth/googleOAuth";
import analyzeRoutes from "./routes/resumes/analyzeRoutes";
import resumeRoutes from "./routes/resumes/resumeRoutes";
import tempRoutes from "./routes/resumes/tempRoutes";
import generateLetterRoutes from "./routes/coverLetter/generateLetterRoutes";
import jobApplicationRoutes from "./routes/jobApplication/jobApplicationRoutes";
import interviewSessionRoutes from "./routes/interview/interviewSessionRoutes";

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(hpp());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || "http://localhost:3000",
  credentials: true,
  exposedHeaders: ["Content-Disposition"],
}));
app.use(httpLogger);

// Health check
app.get("/", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbStatus = dbStates[mongoose.connection.readyState];
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", googleRoutes);
app.use("/api/resumes/temp", tempRoutes);
app.use("/api/resumes/analyze", analyzeRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/cover-letter", generateLetterRoutes);
app.use("/api/job-application", jobApplicationRoutes);
app.use("/api/interview", interviewSessionRoutes);

// 404 fallback
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use(errorHandler);

export default app;
