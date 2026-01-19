import { checkRedisQuota } from "../lib/checkRedisQuota";
import { backgroundQueue } from "./queues/background.queue";
import { jobHandlers } from "./jobs";

export interface ProcessJobOptions {
  delay?: number; // Delay in milliseconds before job runs
}

export async function processJob(name: string, data: any, options?: ProcessJobOptions) {
  const quota = await checkRedisQuota();

  if (!quota.exceeded) {
    await backgroundQueue.add(name, data, { 
      removeOnComplete: true,
      delay: options?.delay 
    });
    return { queued: true };
  } else {
    
    if (options?.delay && options.delay > 0) {
      return { queued: false, fallbackToCron: true };
    }
    
    const handler = jobHandlers[name];
    if (!handler) throw new Error(`No inline handler for job: ${name}`);
    await handler(data);
    return { queued: false };
  }
}
