import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { globalEventEmitter } from "@/lib/event-emitter";

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

    // Broadcast agent_joined event to customer via real-time channel
    const agentJoinedPayload = {
      type: "broadcast",
      event: "agent_joined",
      payload: {
        agentId: user.id,
        agentName: user.name || user.email || "Support Agent",
        timestamp: new Date(),
      },
    };

    globalEventEmitter.emit(`chat:${chatId}:agent_joined`, agentJoinedPayload);

    console.log(`📢 Broadcasted agent_joined event for chat:${chatId}`);

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
