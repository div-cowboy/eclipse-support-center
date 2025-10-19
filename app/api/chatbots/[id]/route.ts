import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chatbots/[id] - Get a specific chatbot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and their organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not found or no organization" },
        { status: 404 }
      );
    }

    // Get the specific chatbot
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      },
      include: {
        contextBlocks: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            chats: true,
            contextBlocks: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error fetching chatbot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/chatbots/[id] - Update a chatbot
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, status, config } = body;

    // Get user and their organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not found or no organization" },
        { status: 404 }
      );
    }

    // Check if chatbot exists and belongs to user's organization
    const existingChatbot = await prisma.chatbot.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      },
    });

    if (!existingChatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Update chatbot
    const chatbot = await prisma.chatbot.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(config !== undefined && { config }),
      },
      include: {
        _count: {
          select: {
            chats: true,
            contextBlocks: true,
          },
        },
      },
    });

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error updating chatbot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/chatbots/[id] - Delete a chatbot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and their organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not found or no organization" },
        { status: 404 }
      );
    }

    // Check if chatbot exists and belongs to user's organization
    const existingChatbot = await prisma.chatbot.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      },
    });

    if (!existingChatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Delete chatbot (this will cascade delete context blocks and chats)
    await prisma.chatbot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Chatbot deleted successfully" });
  } catch (error) {
    console.error("Error deleting chatbot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
