import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/embed/chats/[id]/email - Save email address to chat metadata
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get chat to check if it exists
    const chat = await prisma.chat.findUnique({
      where: { id: id },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Get existing metadata or create new
    const existingMetadata = chat.metadata
      ? (chat.metadata as Record<string, unknown>)
      : {};

    // Update chat with email in metadata
    await prisma.chat.update({
      where: { id: id },
      data: {
        metadata: {
          ...existingMetadata,
          customerEmail: email.trim(),
          emailCollectedAt: new Date().toISOString(),
        },
      },
    });

    // Create a system message that only agents can see (similar to "agent joined" message)
    const systemMessage = await prisma.message.create({
      data: {
        content: `📧 Customer submitted email: ${email.trim()}`,
        role: "SYSTEM",
        chatId: id,
        userId: null, // System messages don't have a user
        metadata: {
          type: "email_submitted",
          email: email.trim(),
          agentOnly: true, // Only visible to agents (support view), not customers
        },
      },
    });

    console.log(`💾 Created system message for email submission:`, {
      messageId: systemMessage.id,
      email: email.trim(),
    });

    return NextResponse.json({
      success: true,
      email: email.trim(),
    });
  } catch (error) {
    console.error("Error saving email to chat:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save email";
    return NextResponse.json(
      {
        error: "Failed to save email",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

