import {
  AuthenticatedWebSocket,
  IncomingWSMessage,
  SavedMessage,
} from "../types";
import { logger } from "../utils/logger";
import { publishToChannel } from "../utils/redis";
import { broadcastToRoom } from "./connection";

const NEXT_API_URL = process.env.NEXT_API_URL || "http://localhost:3000";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Handle incoming chat message
 */
export async function handleChatMessage(
  ws: AuthenticatedWebSocket,
  message: IncomingWSMessage
): Promise<void> {
  const { chatId, userId } = ws;
  const { content, role } = message;

  if (!content || !role) {
    ws.send(
      JSON.stringify({
        type: "error",
        error: "Missing content or role",
      })
    );
    return;
  }

  try {
    logger.debug(
      `Processing chat message from user ${userId} in chat ${chatId}`
    );

    // Save message to database via Next.js API
    const response = await fetch(
      `${NEXT_API_URL}/api/chats/${chatId}/messages/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_API_SECRET || "",
        },
        body: JSON.stringify({
          content,
          role,
          userId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = (await response.json()) as { message: SavedMessage };
    const savedMessage: SavedMessage = result.message;

    // Prepare broadcast payload
    const broadcastPayload = {
      type: "message",
      data: {
        id: savedMessage.id,
        content: savedMessage.content,
        role: savedMessage.role.toLowerCase(),
        timestamp: savedMessage.createdAt,
        sender: savedMessage.sender,
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to local connections (instant delivery)
    const localBroadcastCount = broadcastToRoom(chatId, broadcastPayload);

    // Publish to Redis for other server instances
    await publishToChannel(`chat:${chatId}`, broadcastPayload);

    logger.info(`Message sent successfully`, {
      chatId,
      userId,
      localBroadcasts: localBroadcastCount,
      messageId: savedMessage.id,
    });
  } catch (error) {
    logger.error(
      `Failed to handle chat message for user ${userId} in chat ${chatId}`,
      error
    );

    ws.send(
      JSON.stringify({
        type: "error",
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    );
  }
}

/**
 * Handle typing indicator
 */
export async function handleTypingIndicator(
  ws: AuthenticatedWebSocket,
  message: IncomingWSMessage
): Promise<void> {
  const { chatId, userId } = ws;
  const { isTyping } = message;

  if (typeof isTyping !== "boolean") {
    return;
  }

  const payload = {
    type: "typing",
    data: {
      userId,
      isTyping,
    },
    timestamp: new Date().toISOString(),
  };

  // Broadcast to local connections (exclude sender)
  broadcastToRoom(chatId, payload, ws);

  // Publish to Redis for other server instances
  try {
    await publishToChannel(`chat:${chatId}`, payload);
  } catch (error) {
    logger.error("Failed to publish typing indicator to Redis", error);
  }
}

/**
 * Handle agent joined event
 */
export async function handleAgentJoined(
  ws: AuthenticatedWebSocket,
  message: IncomingWSMessage
): Promise<void> {
  const { chatId, userId } = ws;

  try {
    // Fetch user info from Next.js API
    const NEXT_API_URL = process.env.NEXT_API_URL || "http://localhost:3000";
    const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

    const response = await fetch(`${NEXT_API_URL}/api/users/${userId}`, {
      headers: {
        "X-Internal-Secret": INTERNAL_API_SECRET || "",
      },
    });

    if (!response.ok) {
      logger.warn("Failed to fetch user info for agent_joined", {
        userId,
        status: response.status,
      });
      ws.send(
        JSON.stringify({
          type: "error",
          error: "Failed to fetch agent info",
        })
      );
      return;
    }

    const userData = (await response.json()) as { name: string; email: string };
    const agentName = userData.name || userData.email || "Agent";

    const payload = {
      type: "agent_joined",
      data: {
        agentId: userId,
        agentName,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to local connections
    broadcastToRoom(chatId, payload);

    // Publish to Redis for other server instances
    await publishToChannel(`chat:${chatId}`, payload);
    logger.info(`Agent joined broadcast sent`, {
      chatId,
      agentId: userId,
      agentName,
    });
  } catch (error) {
    logger.error("Failed to handle agent_joined", error);
    ws.send(
      JSON.stringify({
        type: "error",
        error: "Failed to process agent_joined event",
      })
    );
  }
}
