import Redis from "ioredis";
import { logger } from "./logger";

let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;

/**
 * Initialize Redis client
 */
export function initRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL must be set");
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redisClient.on("error", (err) => {
    logger.error("Redis client error", err);
  });

  redisClient.on("connect", () => {
    logger.info("Redis client connected");
  });

  logger.info("Redis client initialized");

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
 * Publish message to Redis channel using native pub/sub
 */
export async function publishToChannel(
  channel: string,
  message: any
): Promise<void> {
  try {
    const redis = getRedis();
    const serialized = JSON.stringify(message);

    // Use native Redis PUBLISH command
    await redis.publish(channel, serialized);

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
 * Subscribe to Redis channel with native pub/sub
 * Returns cleanup function to unsubscribe
 */
export function subscribeToChannel(
  channel: string,
  callback: (message: any) => void
): () => void {
  // Create dedicated subscriber connection if not exists
  if (!redisSubscriber) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL must be set");
    }

    redisSubscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisSubscriber.on("error", (err) => {
      logger.error("Redis subscriber error", err);
    });

    redisSubscriber.on("connect", () => {
      logger.info("Redis subscriber connected");
    });
  }

  // Subscribe to channel
  redisSubscriber.subscribe(channel, (err) => {
    if (err) {
      logger.error("Failed to subscribe to channel", { channel, error: err });
    } else {
      logger.info("Subscribed to Redis channel", { channel });
    }
  });

  // Handle incoming messages
  const messageHandler = (ch: string, message: string) => {
    if (ch === channel) {
      try {
        const parsed = JSON.parse(message);
        callback(parsed);
      } catch (err) {
        logger.error("Failed to parse Redis message", err);
      }
    }
  };

  redisSubscriber.on("message", messageHandler);

  // Return cleanup function
  return () => {
    if (redisSubscriber) {
      redisSubscriber.unsubscribe(channel);
      redisSubscriber.off("message", messageHandler);
      logger.info("Unsubscribed from Redis channel", { channel });
    }
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
