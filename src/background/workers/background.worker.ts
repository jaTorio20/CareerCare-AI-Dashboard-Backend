import { Worker } from "bullmq";
import { redis } from "../../lib/redis";
import { jobHandlers } from "../jobs";
import { checkRedisQuota } from "../../lib/checkRedisQuota";
// import connectDB from "../../config/db";

export const startWorker = async () => {
//  await connectDB();

const quota = await checkRedisQuota(); 
  if (quota.exceeded) { 
    console.warn("Redis quota exceeded. Worker not started, inline processing only."); 
    return null; // signal to bootstrap that no worker is running 
  }

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

  worker.on("error", err => { 
    console.error("BullMQ Worker error:", err.message); 
  }); 

  return worker;
};
