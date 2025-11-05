import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { Redis } from "@upstash/redis";

/**
 * POST /api/chats/[id]/assign - Assign a chat to the current user (Pick Up Chat)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chatId = params.id;

    // Verify chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        chatbot: {
          include: {
            organization: true,
          },
        },
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

    // Check if user has access to this chat's organization
    const userOrganizations = await prisma.organization.findMany({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    const organizationIds = userOrganizations.map((org) => org.id);
    const chatOrgId = chat.chatbot?.organizationId;

    // Allow access if it's a traditional chat (no chatbot) or if user is in the organization
    if (chatOrgId && !organizationIds.includes(chatOrgId)) {
      return NextResponse.json(
        { error: "You don't have access to this chat" },
        { status: 403 }
      );
    }

    // Check if already assigned
    if (chat.assignedToId) {
      if (chat.assignedToId === user.id) {
        return NextResponse.json({
          success: true,
          message: "Chat is already assigned to you",
          chat: {
            ...chat,
            assignedTo: chat.assignedTo,
          },
        });
      } else {
        return NextResponse.json(
          {
            error: "Chat is already assigned to another user",
            assignedTo: chat.assignedTo,
          },
          { status: 409 }
        );
      }
    }

    // Assign the chat to the current user
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        assignedToId: user.id,
        assignedAt: new Date(),
      },
      include: {
        chatbot: {
          include: {
            organization: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`✅ Chat ${chatId} assigned to user ${user.email}`);

    // Create a system message in the database to persist the connection
    const agentName = user.name || user.email || "Support Agent";
    const systemMessage = await prisma.message.create({
      data: {
        content: `✅ You're now connected to ${agentName}`,
        role: "SYSTEM",
        chatId: chatId,
        userId: null, // System messages don't have a user
        metadata: {
          type: "agent_joined",
          agentId: user.id,
          agentName: agentName,
        },
      },
    });

    console.log(`💾 Created system message for agent connection:`, {
      messageId: systemMessage.id,
      agentName,
    });

    // Prepare agent info for broadcast
    const agentJoinedPayload = {
      type: "agent_joined",
      data: {
        agentId: user.id,
        agentName: agentName,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast via Redis pub/sub for WebSocket servers
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        // Use Redis PUBLISH (pub/sub) not lpush (streams)
        // The WebSocket server subscribes to 'chat:{chatId}' channel
        await redis.publish(
          `chat:${chatId}`,
          JSON.stringify(agentJoinedPayload)
        );

        console.log(
          `📢 [Redis Pub/Sub] Published agent_joined to chat:${chatId}`,
          {
            agentName: agentJoinedPayload.data.agentName,
            channel: `chat:${chatId}`,
          }
        );
      } catch (error) {
        console.error(
          "Failed to publish agent_joined to Redis pub/sub:",
          error
        );
        // Don't fail the request if Redis broadcast fails
      }
    }

    console.log(
      `✅ [Server] Chat assigned - agent_joined event published to Redis`
    );

    return NextResponse.json({
      success: true,
      message: "Chat successfully assigned to you",
      chat: updatedChat,
    });
  } catch (error) {
    console.error("Error assigning chat:", error);
    return NextResponse.json(
      {
        error: "Failed to assign chat",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats/[id]/assign - Unassign a chat (Release Chat)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chatId = params.id;

    // Verify chat exists and is assigned to this user
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.assignedToId !== user.id) {
      return NextResponse.json(
        { error: "You can only release chats assigned to you" },
        { status: 403 }
      );
    }

    // Unassign the chat
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        assignedToId: null,
        assignedAt: null,
      },
    });

    console.log(`✅ Chat ${chatId} released by user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Chat successfully released",
      chat: updatedChat,
    });
  } catch (error) {
    console.error("Error releasing chat:", error);
    return NextResponse.json(
      {
        error: "Failed to release chat",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
