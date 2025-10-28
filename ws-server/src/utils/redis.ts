import { Redis } from "@upstash/redis";
import { logger } from "./logger";

let redisClient: Redis | null = null;

/**
 * Initialize Redis client
 */
export function initRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set"
    );
  }

  redisClient = new Redis({
    url,
    token,
  });

  logger.info("Redis client initialized", {
    url: url.substring(0, 30) + "...",
  });

  return redisClient;
}

/**
 * Get Redis client instance
 */
export function getRedis(): Redis {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Publish message to Redis channel
 */
export async function publishToChannel(
  channel: string,
  message: any
): Promise<void> {
  try {
    const redis = getRedis();
    const serialized = JSON.stringify(message);

    // Use Redis Streams instead of pub/sub for Upstash REST API compatibility
    await redis.lpush(`stream:${channel}`, serialized);

    // Trim to keep only last 100 messages per channel
    await redis.ltrim(`stream:${channel}`, 0, 99);

    logger.debug("Published to Redis channel", {
      channel,
      messageType: message.type,
    });
  } catch (error) {
    logger.error("Failed to publish to Redis", error);
    throw error;
  }
}

/**
 * Poll Redis channel for new messages
 * This is a workaround for Upstash REST API not supporting pub/sub
 */
export async function pollChannel(
  channel: string,
  callback: (message: any) => void,
  intervalMs: number = 1000
): Promise<() => void> {
  let lastIndex = 0;
  let isPolling = true;

  const redis = getRedis();
  const streamKey = `stream:${channel}`;

  async function poll() {
    if (!isPolling) return;

    try {
      // Get all messages from stream
      const messages = await redis.lrange(streamKey, 0, -1);

      if (messages.length > lastIndex) {
        // Process new messages
        const newMessages = messages.slice(lastIndex);
        for (const msg of newMessages) {
          try {
            // Check if message is already an object or needs to be parsed
            let parsed;
            if (typeof msg === "string") {
              parsed = JSON.parse(msg);
            } else if (typeof msg === "object" && msg !== null) {
              // Already an object, use as-is
              parsed = msg;
            } else {
              logger.warn("Unexpected message format in Redis", {
                type: typeof msg,
                msg,
              });
              continue;
            }
            callback(parsed);
          } catch (err) {
            logger.error("Failed to parse Redis message", err);
          }
        }
        lastIndex = messages.length;
      }
    } catch (error) {
      logger.error("Error polling Redis channel", error);
    }

    // Schedule next poll
    setTimeout(poll, intervalMs);
  }

  // Start polling
  poll();

  // Return cleanup function
  return () => {
    isPolling = false;
  };
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedis();
    await redis.ping();
    return true;
  } catch (error) {
    logger.error("Redis health check failed", error);
    return false;
  }
}
