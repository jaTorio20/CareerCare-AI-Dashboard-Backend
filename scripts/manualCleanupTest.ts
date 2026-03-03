import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { ResumeModel } from "../src/models/Resume.ts";
import { v2 as cloudinary } from "cloudinary";

(async () => {
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/careercare");
    console.log("Connected to the database.");

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const oldTemps = await ResumeModel.find({
      createdAt: { $lt: cutoff },
      isTemp: true,
    });

    const publicIds = oldTemps.map((resume) => resume.publicId);

    // Delete files from Cloudinary in bulk
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds, { resource_type: "raw" });
    }

    // Delete documents from MongoDB in bulk
    await ResumeModel.deleteMany({
      createdAt: { $lt: cutoff },
      isTemp: true,
    });

    console.log(`Cleanup completed. Deleted ${oldTemps.length} resumes.`);
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
})();