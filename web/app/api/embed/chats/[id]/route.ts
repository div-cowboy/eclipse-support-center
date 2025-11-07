import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/embed/chats/[id] - Get a specific chat with messages (public for embeds)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get chat with messages - no authentication required for embed chats
    const chat = await prisma.chat.findUnique({
      where: {
        id: id,
        status: { not: "DELETED" }, // Don't return deleted chats
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            metadata: true,
            userId: true,
          },
        },
        chatbot: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify this is an embed chat (has a chatbot)
    if (!chat.chatbot) {
      return NextResponse.json(
        { error: "This endpoint is only for embed chats" },
        { status: 400 }
      );
    }

    // Only allow access to active chatbots
    if (chat.chatbot.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Chatbot is not active" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: chat.id,
      title: chat.title,
      description: chat.description,
      status: chat.status,
      escalationRequested: chat.escalationRequested,
      escalationReason: chat.escalationReason,
      assignedToId: chat.assignedToId,
      assignedTo: chat.assignedTo,
      assignedAt: chat.assignedAt,
      metadata: chat.metadata, // Include metadata (contains customerEmail)
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: chat.messages,
      chatbot: chat.chatbot,
      _count: chat._count,
    });
  } catch (error) {
    console.error("Error fetching embed chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}
