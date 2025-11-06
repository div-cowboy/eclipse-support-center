import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/embed/chatbots/[id]/save-message
 * Save a message to database without triggering AI response
 * Creates chat if it doesn't exist
 * Saves as ASSISTANT role so it appears on support rep side (left side)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  let chatId: string | null | undefined;

  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    const body = await request.json();
    const {
      message,
      chatId: requestChatId = null, // Optional chatId to add to existing chat
    } = body;
    chatId = requestChatId;

    console.log("[SaveMessage] Request received:", {
      chatbotId: id,
      chatId: chatId,
      hasMessage: !!message,
      messageLength: message?.length,
    });

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Get chatbot info
    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: id,
        status: "ACTIVE",
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Get or create chat record
    let chat;
    if (chatId) {
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
      });
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
    } else {
      // Create new chat for this embed conversation
      chat = await prisma.chat.create({
        data: {
          title: `Embed Chat - ${new Date().toLocaleDateString()}`,
          description: `Embedded chat with ${chatbot.name}`,
          chatbotId: chatbot.id,
          status: "ACTIVE",
        },
      });
    }

    // Save assistant message to database (NO AI processing)
    // This appears on the support rep side (left side) of the chat
    const savedMessage = await prisma.message.create({
      data: {
        content: message.trim(),
        role: "ASSISTANT", // ASSISTANT role so it appears on support rep side
        chatId: chat.id,
        userId: null, // No user for auto-sent messages
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

    console.log(`[SaveMessage] Saved message to chat:${chat.id}`, {
      messageId: savedMessage.id,
      chatId: chat.id,
    });

    return NextResponse.json({
      success: true,
      chatId: chat.id,
      message: {
        id: savedMessage.id,
        content: savedMessage.content,
        role: savedMessage.role.toLowerCase(),
        timestamp: savedMessage.createdAt,
        userId: savedMessage.userId,
      },
    });
  } catch (error) {
    console.error("Error saving message:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      chatbotId: id || "unknown",
      chatId: chatId ?? "unknown",
      hasChatId: chatId !== undefined,
    });
    return NextResponse.json(
      {
        error: "Failed to save message",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
