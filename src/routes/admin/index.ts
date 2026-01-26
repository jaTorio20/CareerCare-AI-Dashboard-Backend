import express from "express";
import { userRoutes } from "./users.route";

const router = express.Router();

// Centralized admin routes
router.use("/users", userRoutes);

export default router;