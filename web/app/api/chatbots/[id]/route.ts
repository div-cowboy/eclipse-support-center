import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chatbots/[id] - Get a specific chatbot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;

    // Get user and their organizations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizations: true },
    });

    if (!user || !user.organizations || user.organizations.length === 0) {
      return NextResponse.json(
        { error: "User not found or no organizations" },
        { status: 404 }
      );
    }

    // Get user organization IDs
    const userOrganizationIds = user.organizations.map((org) => org.id);

    // Get the specific chatbot
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: resolvedParams.id,
        organizationId: { in: userOrganizationIds },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { name, description, status, config } = body;

    // Get user and their organizations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizations: true },
    });

    if (!user || !user.organizations || user.organizations.length === 0) {
      return NextResponse.json(
        { error: "User not found or no organizations" },
        { status: 404 }
      );
    }

    // Get user organization IDs
    const userOrganizationIds = user.organizations.map((org) => org.id);

    // Check if chatbot exists and belongs to user's organization
    const existingChatbot = await prisma.chatbot.findFirst({
      where: {
        id: resolvedParams.id,
        organizationId: { in: userOrganizationIds },
      },
    });

    if (!existingChatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Update chatbot
    const chatbot = await prisma.chatbot.update({
      where: { id: resolvedParams.id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and their organizations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizations: true },
    });

    if (!user || !user.organizations || user.organizations.length === 0) {
      return NextResponse.json(
        { error: "User not found or no organizations" },
        { status: 404 }
      );
    }

    // Get user organization IDs
    const userOrganizationIds = user.organizations.map((org) => org.id);

    // Check if chatbot exists and belongs to user's organization
    const existingChatbot = await prisma.chatbot.findFirst({
      where: {
        id: id,
        organizationId: { in: userOrganizationIds },
      },
    });

    if (!existingChatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Delete chatbot (this will cascade delete context blocks and chats)
    await prisma.chatbot.delete({
      where: { id: id },
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
