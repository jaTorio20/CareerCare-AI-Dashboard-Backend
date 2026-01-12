import axios from "axios";

export async function checkRedisQuota() {
  try {
    const resp = await axios.get(
      `https://api.upstash.com/v1/redis/${process.env.UPSTASH_REDIS_ID}/metrics`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_API_TOKEN}`,
        },
      }
    );

    const used = resp.data?.commands ?? 0;
    const limit = resp.data?.max_commands ?? 500000;
    return { used, limit, exceeded: used >= limit };
  } catch (err) {
    console.error("Failed to check quota:", err);
    // Fail safe: assume exceeded so we don’t burn quota
    return { used: 0, limit: 0, exceeded: true };
  }
}
