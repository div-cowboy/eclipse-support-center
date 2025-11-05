import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chats/[id] - Get a specific chat with messages (traditional or embedded)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const chat = await prisma.chat.findUnique({
      where: {
        id: id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
        chatbot: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
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
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify access: chat belongs to user's organization (for embedded) or is traditional (no chatbot)
    const organizationIds = user.organizations.map((org) => org.id);
    const hasAccess =
      !chat.chatbot || // Traditional chat
      organizationIds.includes(chat.chatbot.organizationId); // Embedded chat from user's org

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this chat" },
        { status: 403 }
      );
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

// PUT /api/chats/[id] - Update chat status or metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, title, description } = body;

    // Get user with organizations for access control
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

    const chat = await prisma.chat.findUnique({
      where: {
        id: id,
      },
      include: {
        chatbot: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify access
    const organizationIds = user.organizations.map((org) => org.id);
    const hasAccess =
      !chat.chatbot || organizationIds.includes(chat.chatbot.organizationId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this chat" },
        { status: 403 }
      );
    }

    const updatedChat = await prisma.chat.update({
      where: { id: id },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(description && { description }),
        updatedAt: new Date(),
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
        chatbot: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
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
    });

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/[id] - Delete a chat (traditional or embedded)
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

    // Get user from database with organizations
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

    const chat = await prisma.chat.findUnique({
      where: {
        id: id,
      },
      include: {
        chatbot: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify access
    const organizationIds = user.organizations.map((org) => org.id);
    const hasAccess =
      !chat.chatbot || organizationIds.includes(chat.chatbot.organizationId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this chat" },
        { status: 403 }
      );
    }

    // Soft delete by updating status
    await prisma.chat.update({
      where: { id: id },
      data: {
        status: "DELETED",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
