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
import authRoutes from "./routes/auth/auth.route";
import resumeRoutes from "./routes/resumes/resume.route";
import coverLetterRoutes from "./routes/coverLetter/coverLetter.route";
import jobApplicationRoutes from "./routes/jobApplication/jobApplication.route";
import interviewSessionRoutes from "./routes/interview/interviewSession.route";
import adminRoutes from "./routes/admin/index";

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
app.use("/api/resumes", resumeRoutes);
app.use("/api/cover-letter", coverLetterRoutes);
app.use("/api/job-application", jobApplicationRoutes);
app.use("/api/interview", interviewSessionRoutes);
app.use("/api/admin", adminRoutes);
// 404 fallback
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use(errorHandler);

export default app;
