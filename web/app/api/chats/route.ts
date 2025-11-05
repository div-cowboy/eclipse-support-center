import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { MessageRole } from "@prisma/client";

// GET /api/chats - List all chats from user's organizations (both embedded and traditional)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database with their organizations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all chatbots from user's organizations
    const organizationIds = user.organizations.map((org) => org.id);
    const chatbots = await prisma.chatbot.findMany({
      where: {
        organizationId: {
          in: organizationIds,
        },
      },
      select: {
        id: true,
      },
    });

    const chatbotIds = chatbots.map((chatbot) => chatbot.id);

    // Fetch all chats from user's organizations:
    // 1. Chats linked to organization chatbots (embedded chats)
    // 2. Traditional chats (chatbotId: null)
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          {
            chatbotId: {
              in: chatbotIds,
            },
          },
          {
            chatbotId: null, // Traditional chats
          },
        ],
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the latest message for preview
        },
        chatbot: {
          include: {
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
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

// POST /api/chats - Create a new traditional chat or add message to existing chat
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { message, chatId, role } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Determine the message role:
    // - AGENT = AI bot response (automated agent)
    // - ASSISTANT = Human support agent response
    // - USER = Customer message (default)
    const messageRole = (
      role === "ASSISTANT" ? "ASSISTANT" : role === "AGENT" ? "AGENT" : "USER"
    ) as MessageRole;

    let chat;

    if (chatId) {
      // Add message to existing chat
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
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

      // Add the message
      await prisma.message.create({
        data: {
          content: message,
          role: messageRole,
          chatId: chatId,
          userId: user.id,
        },
      });

      // Update chat's updatedAt timestamp
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      // Return success response
      return NextResponse.json({
        success: true,
        response:
          "Thank you for your message. A support agent will respond shortly.",
        chat: {
          ...chat,
          _count: {
            messages: chat._count.messages + 1,
          },
        },
      });
    } else {
      // Create new chat
      chat = await prisma.chat.create({
        data: {
          title:
            message.length > 50 ? message.substring(0, 50) + "..." : message,
          description: message.length > 50 ? message : undefined,
          status: "ACTIVE",
          chatbotId: null, // Traditional chat, not linked to a chatbot
        },
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
      });

      // Add the initial message
      await prisma.message.create({
        data: {
          content: message,
          role: messageRole,
          chatId: chat.id,
          userId: user.id,
        },
      });

      // Return success response
      return NextResponse.json({
        success: true,
        response:
          "Thank you for your message. A support agent will respond shortly.",
        chat: {
          ...chat,
          _count: {
            messages: 1,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error creating/updating chat:", error);
    return NextResponse.json(
      { error: "Failed to create/update chat" },
      { status: 500 }
    );
  }
}
