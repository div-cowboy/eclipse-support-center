import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { Redis } from "@upstash/redis";

/**
 * POST /api/chats/[id]/messages/send
 * Send a real-time message in a chat
 * Saves to database and broadcasts via Redis pub/sub to WebSocket server
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chatId = id;

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

    // Handle userId for anonymous users
    // For anonymous users (userId starts with 'anon_'), create/get temporary user record
    let messageUserId: string | null;

    if (isInternalRequest && userId?.startsWith("anon_")) {
      // Check if temporary user already exists
      const tempEmail = `${userId}@anonymous.temp`;
      let tempUser = await prisma.user.findUnique({
        where: { email: tempEmail },
        select: { id: true },
      });

      // Create temporary user if doesn't exist
      if (!tempUser) {
        tempUser = await prisma.user.create({
          data: {
            email: tempEmail,
            name: "Anonymous User",
            // No emailVerified - indicates temporary account
          },
          select: { id: true },
        });
        console.log(
          `📝 Created temporary user: ${tempUser.id} for session ${userId}`
        );
      }

      messageUserId = tempUser.id;
    } else {
      // Regular authenticated user or internal request with real userId
      messageUserId = isInternalRequest ? userId : session?.user?.id || null;
    }

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

    // Prepare sender info
    const sender = message.user
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
        };

    // Broadcast via Redis pub/sub to WebSocket server
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        // Prepare payload for WebSocket (matches WebSocket server format)
        const wsPayload = {
          type: "message",
          data: {
            id: message.id,
            content: message.content,
            role: message.role.toLowerCase(),
            timestamp: message.createdAt,
            sender: sender,
          },
          timestamp: new Date().toISOString(),
        };

        // Use Redis PUBLISH (pub/sub) - the WebSocket server subscribes to this channel
        await redis.publish(`chat:${chatId}`, JSON.stringify(wsPayload));

        console.log(`📢 [Redis Pub/Sub] Published message to chat:${chatId}`, {
          messageId: message.id,
          role: message.role,
          channel: `chat:${chatId}`,
        });
      } catch (error) {
        console.error("Failed to publish message to Redis pub/sub:", error);
        // Don't fail the request if Redis broadcast fails
      }
    }

    console.log(`[Real-time] Message sent to chat:${chatId}`, {
      messageId: message.id,
      role: message.role,
      sender: sender.name,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        role: message.role,
        createdAt: message.createdAt,
        sender: sender,
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
