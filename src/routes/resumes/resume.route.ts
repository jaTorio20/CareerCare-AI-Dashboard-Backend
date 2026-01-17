import express from "express";
import { protect } from "../../middleware/authMiddleware";
import { uploadMiddleware } from "../../middleware/uploadMiddleware";
import { validate } from "../../middleware/validate";

// Controllers
import { createResume, deleteResume, downloadResume, getResumeById, getResumes,
} from "../../controllers/resumes/resume.controller";
import { analyzeResume } from "../../controllers/resumes/analyze.controller";
import { deleteTempResume, getLatestTempResume, } from "../../controllers/resumes/temp.controller";

// Schemas
import { createResumeSchema, deleteResumeSchema, uploadResumeSchema, } from "./resume.schema";

const router = express.Router();

// TEMP RESUME ROUTES (/api/resumes/temp)
router.get("/temp", protect, getLatestTempResume);
router.delete("/temp/:id", protect, deleteTempResume);

// ANALYZE ROUTES (/api/resumes/analyze)
router.post( "/analyze", protect, uploadMiddleware.single("resumeFile"), 
  validate(uploadResumeSchema), analyzeResume);


// RESUME CRUD ROUTES (/api/resumes)
router.get("/:id/download", protect, downloadResume);
router.post("/", protect, validate(createResumeSchema), createResume);
router.get("/", protect, getResumes);
router.get("/:id", protect, getResumeById);
router.delete("/:id", protect, validate(deleteResumeSchema), deleteResume);

export default router;
