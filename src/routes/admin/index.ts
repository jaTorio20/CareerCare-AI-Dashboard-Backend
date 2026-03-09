import express from "express";
import { userRoutes } from "./users.route";
import { statisticsRoutes } from "./statistics.route";

const router = express.Router();

// Centralized admin routes
router.use("/users", userRoutes);
router.use("/statistics", statisticsRoutes);

export default router;