import mongoose from "mongoose";
import dotenv from "dotenv";
import { ResumeModel } from "../src/models/Resume.ts";
import { StatisticsModel } from "../src/models/Statistics.ts";

// Load environment variables from .env file
dotenv.config();

const initializeStatistics = async () => {
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/careercare");

    console.log("Connected to the database.");

    // Count all resumes
    const analyzedResumesCount = await ResumeModel.countDocuments();

    // Check if a Statistics document already exists
    let statistics = await StatisticsModel.findOne();

    if (!statistics) {
      // Create a new Statistics document if none exists
      statistics = new StatisticsModel({
        analyzedResumesCount,
      });
      await statistics.save();
      console.log("Statistics initialized:", statistics);
    } else {
      // Update the existing Statistics document
      statistics.analyzedResumesCount = analyzedResumesCount;
      await statistics.save();
      console.log("Statistics updated:", statistics);
    }

    console.log("Initialization complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing statistics:", error);
    process.exit(1);
  }
};

initializeStatistics();