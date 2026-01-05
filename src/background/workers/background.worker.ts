import { Worker } from "bullmq";
import { redis } from "../../lib/redis";
import { jobHandlers } from "../jobs";
import connectDB from "../../config/db";

(async () => {
  // Connect to MongoDB first
  await connectDB();

  const worker = new Worker(
    "background-jobs",
    async job => {
      const handler = jobHandlers[job.name];
      if (!handler) throw new Error(`No handler for job: ${job.name}`);
      await handler(job.data);
    },
    {
      connection: redis,
      concurrency: 2, // adjust for AI jobs
    }
  );

  worker.on("completed", job =>
    console.log(`Job ${job.id} (${job.name}) completed`)
  );
  worker.on("failed", (job, err) =>
    console.error(`Job ${job?.id} failed`, err)
  );
})();
