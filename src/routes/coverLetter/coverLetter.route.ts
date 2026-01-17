import express from "express";
import { protect } from "../../middleware/authMiddleware";
import { validate } from "../../middleware/validate";

// Controllers
import {
  generateLetter,
  saveCoverLetter,
  getCoverLetters,
  getCoverLetterById,
  updateCoverLetter,
  deleteCoverLetter,
} from "../../controllers/coverLetter/coverLetter.controller";

// Schemas
import {
  generateCoverLetterSchema,
  saveCoverLetterSchema,
  updateCoverLetterSchema,
  deleteCoverLetterSchema,
} from "./coverLetter.schema";

const router = express.Router();

// ============================================
// COVER LETTER ROUTES (/api/cover-letter)
// ============================================

// @route          POST /api/cover-letter/generate
// @description    Generate a cover letter based on job description and optional user details
// @access         Private
router.post("/generate", protect, validate(generateCoverLetterSchema), generateLetter);

// @route          POST /api/cover-letter
// @description    Save generated cover letter to DB
// @access         Private
router.post("/", protect, validate(saveCoverLetterSchema), saveCoverLetter);

// @route          GET /api/cover-letter
// @description    Fetch all cover letters from DB
// @access         Private
router.get("/", protect, getCoverLetters);

// @route          GET /api/cover-letter/:id
// @description    Fetch a specific cover letter by ID
// @access         Private
router.get("/:id", protect, getCoverLetterById);

// @route          PUT /api/cover-letter/:id
// @description    Update a specific cover letter by ID
// @access         Private
router.put("/:id", protect, validate(updateCoverLetterSchema), updateCoverLetter);

// @route          DELETE /api/cover-letter/:id
// @description    Delete a specific cover letter by ID
// @access         Private
router.delete("/:id", protect, validate(deleteCoverLetterSchema), deleteCoverLetter);

export default router;
