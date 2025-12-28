import cron from "node-cron";
import { ResumeModel } from "../models/Resume";
import { v2 as cloudinary } from "cloudinary";; // adjust path according to your project

export const scheduleCleanupTempResumes = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Find temp resumes older than cutoff
      const oldTemps = await ResumeModel.find({
        createdAt: { $lt: cutoff },
        isTemp: true,
      });

      for (const resume of oldTemps) {
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(resume.publicId, { resource_type: "raw" });
        // Delete from MongoDB
        await ResumeModel.deleteOne({ _id: resume._id });
      }

      console.log(`Cleaned up ${oldTemps.length} temp resumes`);
    } catch (err) {
      console.error("Error cleaning temp resumes:", err);
    }
  });
};

