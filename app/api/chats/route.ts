import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chats - List all traditional chats (not linked to chatbots)
export async function GET() {
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

    const chats = await prisma.chat.findMany({
      where: {
        chatbotId: null, // Traditional chats don't have a chatbotId
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
    const { message, chatId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

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

      // Add the user message
      await prisma.message.create({
        data: {
          content: message,
          role: "USER",
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

      // Add the user message
      await prisma.message.create({
        data: {
          content: message,
          role: "USER",
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
