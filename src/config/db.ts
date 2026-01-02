import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";

dotenv.config();

const connectDB = async (): Promise<void> => { //always use Promise<void> for async functions that do not return a value
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.fatal({error}, "Error connecting to MongoDB:" );
    process.exit(1);
  }
};

export default connectDB;