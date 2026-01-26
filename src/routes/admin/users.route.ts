import express from "express";
import { protect, adminOnly } from "../../middleware/authMiddleware";
import { getDashboardStats, getAllUsers, deleteUser } from "../../controllers/admin/users/user.controller";

const router = express.Router();

// Admin dashboard stats
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// Get all users
router.get("/", protect, adminOnly, getAllUsers);

// Delete a user
router.delete("/:id", protect, adminOnly, deleteUser);

export { router as userRoutes };