import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chatbots/[id]/chats - Get chats for a specific chatbot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");
    const offset = parseInt(searchParams.get("offset") || "0");

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

    // Verify chatbot belongs to user's organization
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: id,
        organizationId: { in: userOrganizationIds },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Get chats for the chatbot
    const chats = await prisma.chat.findMany({
      where: {
        chatbotId: id,
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chatbot chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
