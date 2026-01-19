import dotenv from "dotenv";
import logger from "./utils/logger";
import connectDB from "./config/db";
import { scheduleCleanupTempResumes } from "./cronJobs/cleanupTempResumes";
import { startReminderCron } from "./cronJobs/reminder.cron";
import { startWorker } from "./background/workers/background.worker";
import app from "./app";

dotenv.config();

// Crash handlers
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "UNHANDLED REJECTION");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "UNCAUGHT EXCEPTION");
  process.exit(1);
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "test") {
    await connectDB(); 
  }

  // Background worker cannot be separate due to free tier limitation
  if (process.env.START_WORKER === "true") {
    const worker = await startWorker();
    if (worker) {
      logger.info("Background worker started");
    } else {
      logger.info("Running in inline mode (no worker)");
    }
  }

  if (process.env.NODE_ENV !== "test") {
    scheduleCleanupTempResumes();
    startReminderCron();
  }

  if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  }
}

bootstrap().catch((err) => {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
});
