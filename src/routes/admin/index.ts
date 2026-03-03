import express from "express";
import { userRoutes } from "./users.route";
import { resumeRoutes } from "./resumes.route";

const router = express.Router();

// Centralized admin routes
router.use("/users", userRoutes);
router.use("/resumes", resumeRoutes);

export default router;