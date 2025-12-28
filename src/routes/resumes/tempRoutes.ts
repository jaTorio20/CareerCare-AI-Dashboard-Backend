import express from "express";
import { v2 as cloudinary } from "cloudinary";
const router = express.Router();

// @route          DELETE /api/resumes/temp/:publicId
// @description    DELETE a temporary uploaded resume file from Cloudinary
// @access         Public
router.delete("/:publicId", async (req, res, next) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    res.status(200).json({ message: "Temporary file deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
