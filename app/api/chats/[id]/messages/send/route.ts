import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { globalEventEmitter } from "@/lib/event-emitter";
import { Redis } from "@upstash/redis";

/**
 * POST /api/chats/[id]/messages/send
 * Send a real-time message in an escalated chat
 * Saves to database and broadcasts via EventEmitter
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;

    // Get request body
    const body = await request.json();
    const { content, role, userId } = body;

    // Check for internal API authentication (from WebSocket server)
    const internalSecret = request.headers.get("x-internal-secret");
    const isInternalRequest =
      internalSecret === process.env.INTERNAL_API_SECRET;

    // Get session for regular user requests
    const session = isInternalRequest ? null : await auth();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (!role || !["USER", "ASSISTANT", "AGENT"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role is required (USER, ASSISTANT, or AGENT)" },
        { status: 400 }
      );
    }

    // Verify chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify chat is escalated (real-time mode only for escalated chats)
    if (!chat.escalationRequested) {
      return NextResponse.json(
        { error: "Chat must be escalated to use real-time messaging" },
        { status: 400 }
      );
    }

    // For ASSISTANT/AGENT role, verify authentication
    if (role === "ASSISTANT" || role === "AGENT") {
      // Allow internal requests from WebSocket server
      if (!isInternalRequest && !session?.user) {
        return NextResponse.json(
          { error: "Authentication required for agent messages" },
          { status: 401 }
        );
      }

      // If not internal request, verify user exists
      if (!isInternalRequest) {
        const user = await prisma.user.findUnique({
          where: { id: session!.user!.id },
        });

        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
      }
    }

    // Create message in database
    // Use userId from body (for WebSocket server) or from session (for regular requests)
    const messageUserId = isInternalRequest
      ? userId
      : session?.user?.id || null;

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        role: role,
        chatId: chatId,
        userId: messageUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Prepare broadcast payload
    const broadcastPayload = {
      type: "broadcast",
      event: "message",
      payload: {
        id: message.id,
        content: message.content,
        role: message.role.toLowerCase(),
        timestamp: message.createdAt,
        sender: message.user
          ? {
              id: message.user.id,
              name: message.user.name || "Anonymous",
              email: message.user.email,
              avatar: message.user.image,
            }
          : {
              id: "anonymous",
              name: "Customer",
              email: null,
              avatar: null,
            },
      },
    };

    // Broadcast to all subscribers on this chat channel (Supabase/legacy)
    globalEventEmitter.emit(`chat:${chatId}:message`, broadcastPayload);

    // Also broadcast via WebSocket (if enabled)
    const useWebSocket = process.env.NEXT_PUBLIC_USE_WEBSOCKET === "true";
    if (
      useWebSocket &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        // Prepare payload for WebSocket (different format than Supabase)
        const wsPayload = {
          type: "message",
          data: broadcastPayload.payload,
          timestamp: new Date().toISOString(),
        };

        // Publish to Redis stream for WebSocket servers
        await redis.lpush(`stream:chat:${chatId}`, JSON.stringify(wsPayload));
        await redis.ltrim(`stream:chat:${chatId}`, 0, 99); // Keep only last 100 messages

        console.log(
          `📢 [WebSocket] Broadcasted message to Redis for chat:${chatId}`
        );
      } catch (error) {
        console.error("Failed to broadcast message via WebSocket:", error);
        // Don't fail the request if Redis broadcast fails
      }
    }

    console.log(`[Real-time] Message sent to chat:${chatId}`, {
      messageId: message.id,
      role: message.role,
      sender: broadcastPayload.payload.sender.name,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        role: message.role,
        createdAt: message.createdAt,
        sender: broadcastPayload.payload.sender,
      },
    });
  } catch (error) {
    console.error("Error sending real-time message:", error);
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
