import { Queue } from "bullmq";
import { redis } from "../../lib/redis";

export const backgroundQueue = new Queue("background-jobs", {
  connection: redis,
});
