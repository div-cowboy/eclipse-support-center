import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chatbots - Get all chatbots for the current user's organization
export async function GET() {
  try {
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

    // Get organization IDs for the user
    const organizationIds = user.organizations.map((org) => org.id);

    // Get all chatbots for the user's organizations
    const chatbots = await prisma.chatbot.findMany({
      where: { organizationId: { in: organizationIds } },
      include: {
        _count: {
          select: {
            chats: true,
            contextBlocks: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(chatbots);
  } catch (error) {
    console.error("Error fetching chatbots:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/chatbots - Create a new chatbot
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, config, organizationId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization is required" },
        { status: 400 }
      );
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

    // Verify that the user can create chatbots for the specified organization
    const userOrganizationIds = user.organizations.map((org) => org.id);
    if (!userOrganizationIds.includes(organizationId)) {
      return NextResponse.json(
        { error: "You can only create chatbots for your organizations" },
        { status: 403 }
      );
    }

    // Create chatbot
    const chatbot = await prisma.chatbot.create({
      data: {
        name,
        description: description || null,
        config: config || null,
        organizationId,
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

    return NextResponse.json(chatbot, { status: 201 });
  } catch (error) {
    console.error("Error creating chatbot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
