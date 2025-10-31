import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage } from "http";
import * as dotenv from "dotenv";
import {
  AuthenticatedWebSocket,
  IncomingWSMessage,
  ServerStats,
} from "./types";
import { logger } from "./utils/logger";
import {
  initRedis,
  checkRedisHealth,
  subscribeToChannel as subscribeToRedisChannel,
  publishToChannel,
} from "./utils/redis";
import { verifyToken, extractToken } from "./middleware/auth";
import {
  addToRoom,
  removeFromRoom,
  setupHeartbeat,
  checkHeartbeats,
  getConnectionStats,
  broadcastToRoom,
} from "./handlers/connection";
import {
  handleChatMessage,
  handleTypingIndicator,
  handleAgentJoined,
} from "./handlers/messages";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET", "REDIS_URL", "INTERNAL_API_SECRET"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT || "8080", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

logger.info("Starting Eclipse WebSocket Server", {
  port: PORT,
  nodeEnv: NODE_ENV,
});

// Initialize Redis
try {
  initRedis();
} catch (error) {
  logger.error("Failed to initialize Redis", error);
  process.exit(1);
}

// Track active Redis channel subscriptions
const activeChannels = new Set<string>();
const channelCleanups = new Map<string, () => void>();

/**
 * Subscribe to Redis channel for a chat room
 */
function subscribeToChannel(chatId: string): void {
  if (activeChannels.has(chatId)) {
    return; // Already subscribed
  }

  logger.info(`Subscribing to Redis channel: chat:${chatId}`);

  const cleanup = subscribeToRedisChannel(`chat:${chatId}`, (message) => {
    // Broadcast received Redis message to local WebSocket connections
    broadcastToRoom(chatId, message);
  });

  activeChannels.add(chatId);
  channelCleanups.set(chatId, cleanup);
}

/**
 * Unsubscribe from Redis channel
 */
function unsubscribeFromChannel(chatId: string): void {
  const cleanup = channelCleanups.get(chatId);
  if (cleanup) {
    cleanup();
    channelCleanups.delete(chatId);
    activeChannels.delete(chatId);
    logger.info(`Unsubscribed from Redis channel: chat:${chatId}`);
  }
}

// Create HTTP server for health checks
const httpServer = createServer(async (req, res) => {
  const url = req.url || "";

  // CORS headers for health checks
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (url === "/health" || url === "/") {
    const stats = getConnectionStats();
    const redisHealthy = await checkRedisHealth();
    const memUsage = process.memoryUsage();

    const health: ServerStats = {
      status: redisHealthy ? "healthy" : "degraded",
      uptime: process.uptime(),
      connections: {
        total: stats.totalConnections,
        byChat: stats.chatRooms.map((room) => ({
          chatId: room.chatId,
          count: room.connections,
        })),
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(health, null, 2));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// Create WebSocket server
const wss = new WebSocketServer({
  noServer: true,
  clientTracking: true,
});

// Handle WebSocket upgrade
httpServer.on(
  "upgrade",
  (request: IncomingMessage, socket: any, head: Buffer) => {
    logger.debug("WebSocket upgrade request received", {
      url: request.url,
      headers: request.headers,
    });

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
);

// Handle new WebSocket connections
wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  const authWs = ws as AuthenticatedWebSocket;

  try {
    // Extract and verify token
    const token = extractToken(req.url || "");

    if (!token) {
      logger.warn("Connection rejected: missing token");
      ws.close(4001, "Missing authentication token");
      return;
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      logger.warn("Connection rejected: invalid token", { error });
      ws.close(4002, error instanceof Error ? error.message : "Invalid token");
      return;
    }

    const { chatId, userId, isAuthenticated } = decoded;

    // Attach metadata to WebSocket
    authWs.chatId = chatId;
    authWs.userId = userId;
    authWs.metadata = {
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    // Setup heartbeat
    setupHeartbeat(authWs);

    // Add to chat room
    addToRoom(authWs);

    // Subscribe to Redis channel for this chat
    await subscribeToChannel(chatId);

    // Send connection confirmation
    authWs.send(
      JSON.stringify({
        type: "connected",
        chatId,
        timestamp: new Date().toISOString(),
      })
    );

    logger.info("WebSocket connection established", {
      userId,
      chatId,
      isAuthenticated,
      totalConnections: getConnectionStats().totalConnections,
    });

    // Handle incoming messages
    authWs.on("message", async (data: Buffer) => {
      try {
        const message: IncomingWSMessage = JSON.parse(data.toString());

        // Update last activity
        if (authWs.metadata) {
          authWs.metadata.lastActivity = new Date();
        }

        logger.debug("Received message", {
          type: message.type,
          userId: authWs.userId,
          chatId: authWs.chatId,
        });

        // Route message to appropriate handler
        switch (message.type) {
          case "message":
            await handleChatMessage(authWs, message);
            break;

          case "typing":
            await handleTypingIndicator(authWs, message);
            break;

          case "agent_joined":
            await handleAgentJoined(authWs, message);
            break;

          case "ping":
            authWs.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            logger.warn("Unknown message type", { type: message.type });
            authWs.send(
              JSON.stringify({
                type: "error",
                error: "Unknown message type",
              })
            );
        }
      } catch (error) {
        logger.error("Error handling message", error);
        authWs.send(
          JSON.stringify({
            type: "error",
            error: "Failed to process message",
          })
        );
      }
    });

    // Handle disconnect
    authWs.on("close", (code, reason) => {
      logger.info("WebSocket connection closed", {
        userId: authWs.userId,
        chatId: authWs.chatId,
        code,
        reason: reason.toString(),
      });

      removeFromRoom(authWs);

      // Cleanup Redis subscription if no more clients in this chat
      const stats = getConnectionStats();
      const chatStillActive = stats.chatRooms.some((room) =>
        room.chatId.startsWith(authWs.chatId.substring(0, 8))
      );

      if (!chatStillActive) {
        unsubscribeFromChannel(authWs.chatId);
      }
    });

    // Handle errors
    authWs.on("error", (error) => {
      logger.error("WebSocket error", {
        userId: authWs.userId,
        chatId: authWs.chatId,
        error,
      });
    });
  } catch (error) {
    logger.error("Error in connection handler", error);
    ws.close(4000, "Internal server error");
  }
});

// Heartbeat interval (check every 30 seconds)
const heartbeatInterval = setInterval(() => {
  checkHeartbeats(wss);
}, 30000);

// Graceful shutdown
const shutdown = () => {
  logger.info("Shutting down server...");

  clearInterval(heartbeatInterval);

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close(1001, "Server shutting down");
  });

  // Cleanup all Redis subscriptions
  activeChannels.forEach((chatId) => {
    unsubscribeFromChannel(chatId);
  });

  wss.close(() => {
    httpServer.close(() => {
      logger.info("Server shut down successfully");
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start server
httpServer.listen(PORT, () => {
  logger.info(`WebSocket server listening on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
});
