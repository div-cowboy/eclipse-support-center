import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { Redis } from "@upstash/redis";

/**
 * PUT /api/chats/[id]/messages/[messageId]
 * Update/edit a message
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: chatId, messageId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Verify chat exists and get assigned agent
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

    // Verify message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify message belongs to this chat
    if (message.chatId !== chatId) {
      return NextResponse.json(
        { error: "Message does not belong to this chat" },
        { status: 400 }
      );
    }

    // Only allow editing ASSISTANT messages (support rep messages)
    // and only if the current user is the assigned agent or the message sender
    if (message.role !== "ASSISTANT") {
      return NextResponse.json(
        { error: "Only support rep messages can be edited" },
        { status: 403 }
      );
    }

    // Verify the user is the assigned agent or the message sender
    const isAssignedAgent = chat.assignedToId === session.user.id;
    const isMessageSender = message.userId === session.user.id;

    if (!isAssignedAgent && !isMessageSender) {
      return NextResponse.json(
        { error: "You can only edit your own messages or messages in chats assigned to you" },
        { status: 403 }
      );
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Prepare sender info
    const sender = updatedMessage.user
      ? {
          id: updatedMessage.user.id,
          name: updatedMessage.user.name || "Anonymous",
          email: updatedMessage.user.email,
          avatar: null,
        }
      : {
          id: "anonymous",
          name: "Customer",
          email: null,
          avatar: null,
        };

    // Broadcast message update via Redis pub/sub to WebSocket server
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
          type: "message_updated",
          data: {
            id: updatedMessage.id,
            content: updatedMessage.content,
            role: updatedMessage.role.toLowerCase(),
            timestamp: updatedMessage.createdAt,
            updatedAt: updatedMessage.updatedAt,
            sender: sender,
          },
          timestamp: new Date().toISOString(),
        };

        // Use Redis PUBLISH (pub/sub) - the WebSocket server subscribes to this channel
        await redis.publish(`chat:${chatId}`, JSON.stringify(wsPayload));

        console.log(
          `📢 [Redis Pub/Sub] Published message update to chat:${chatId}`,
          {
            messageId: updatedMessage.id,
            role: updatedMessage.role,
            channel: `chat:${chatId}`,
          }
        );
      } catch (error) {
        console.error("Failed to publish message update to Redis pub/sub:", error);
        // Don't fail the request if Redis broadcast fails
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        id: updatedMessage.id,
        content: updatedMessage.content,
        role: updatedMessage.role,
        timestamp: updatedMessage.createdAt,
        updatedAt: updatedMessage.updatedAt,
        userId: updatedMessage.userId,
        sender: sender,
      },
    });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

