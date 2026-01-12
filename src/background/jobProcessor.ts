import { checkRedisQuota } from "../lib/checkRedisQuota";
import { backgroundQueue } from "./queues/background.queue";
import { jobHandlers } from "./jobs";

export async function processJob(name: string, data: any) {
  const quota = await checkRedisQuota();

  if (!quota.exceeded) {
    await backgroundQueue.add(name, data, { removeOnComplete: true });
    return { queued: true };
  } else {
    const handler = jobHandlers[name];
    if (!handler) throw new Error(`No inline handler for job: ${name}`);
    await handler(data);
    return { queued: false };
  }
}
