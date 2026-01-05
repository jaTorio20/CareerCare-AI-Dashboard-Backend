import { redis } from "./redis";

(async () => {
  try {
    await redis.set("test", "ok");
    const value = await redis.get("test");
    console.log("Redis OK:", value);
  } catch (err) {
    console.error(err);
  } finally {
    redis.disconnect();
  }
})();
