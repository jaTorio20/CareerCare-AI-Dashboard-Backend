import mongoose from "mongoose";
import { User } from "../src/models/User";
import dotenv from "dotenv";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/careercare";

async function migrateSetIsActiveTrue() {
  try {
    // Connect to the database
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to the database");


    const result = await User.updateMany({}, { isActive: true });

    console.log(`Migration complete. Updated ${result.modifiedCount} users.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from the database");
  }
}

migrateSetIsActiveTrue();
