import express, { Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import { protect } from "../../middleware/authMiddleware";
import { ResumeModel } from "../../models/Resume";
const router = express.Router();

// @route          GET /api/resumes/temp
// @description    Fetch latest temp resume with analysis
// @access         Private
router.get("/", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: "jobId is required" });
    }

    const tempResume = await ResumeModel.findOne({
      userId: req.user._id,
      jobId,
      isTemp: true,
    }).sort({ createdAt: -1 });

    if (!tempResume) {
      return res.status(404).json({ message: "No temp resume found" });
    }

    res.json({
      _id: tempResume._id,
      jobId: tempResume.jobId,
      resumeFile: tempResume.resumeFile,
      publicId: tempResume.publicId,
      originalName: tempResume.originalName,
      jobDescription: tempResume.jobDescription,
      analysis: tempResume.analysis,
    });
  } catch (err) {
    next(err);
  }
});

// @route          DELETE /api/resumes/temp/:publicId
// @description    DELETE a temporary uploaded resume file from Cloudinary
// @access         Public
router.delete(
  "/:id",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;

      const resume = await ResumeModel.findById(id);

      if (!resume) {
        res.status(404);
        throw new Error("Temporary resume not found");
      }

      if (!resume.isTemp) {
        res.status(400);
        throw new Error("This resume is not temporary");
      }

      // ownership check
      if (resume.userId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Unauthorized");
      }

      // delete Cloudinary file
      if (resume.publicId) {
        await cloudinary.uploader.destroy(resume.publicId, {
          resource_type: "raw",
        });
      }

      // delete DB record
      await resume.deleteOne();

      res.status(200).json({ message: "Temporary resume deleted" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
