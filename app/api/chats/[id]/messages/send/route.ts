import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { globalEventEmitter } from "@/lib/event-emitter";

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
    const session = await auth();
    const chatId = params.id;

    // Get request body
    const body = await request.json();
    const { content, role } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (!role || !["USER", "ASSISTANT"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role is required (USER or ASSISTANT)" },
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

    // For ASSISTANT role, verify user is the assigned agent
    if (role === "ASSISTANT") {
      if (!session?.user) {
        return NextResponse.json(
          { error: "Authentication required for agent messages" },
          { status: 401 }
        );
      }

      // Check if user is assigned to this chat or has agent role
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      // For now, allow any authenticated user to respond as agent
      // In production, you might want stricter role checking
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    // Create message in database
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        role: role,
        chatId: chatId,
        userId: session?.user?.id || null,
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

    // Broadcast to all subscribers on this chat channel
    globalEventEmitter.emit(`chat:${chatId}:message`, broadcastPayload);

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
