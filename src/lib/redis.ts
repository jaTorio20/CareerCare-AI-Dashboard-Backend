import IORedis from "ioredis";
import dotenv from 'dotenv';

dotenv.config();

const UPSTASH_URL = process.env.UPSTASH_REDIS_URL!;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_TOKEN!;

export const redis = new IORedis(UPSTASH_URL, {
  password: UPSTASH_TOKEN, // authenticate
  tls: {},                  // required for rediss://
  maxRetriesPerRequest: null, // required for BullMQ
});

redis.on("connect", () => console.log(" Connected to Redis (Upstash)"));
redis.on("error", (err) => console.error("Redis connection error:", err));