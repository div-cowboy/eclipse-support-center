import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chatbots/[id]/context-blocks - Get all context blocks for a chatbot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get user organization IDs
    const userOrganizationIds = user.organizations.map((org) => org.id);

    // Verify chatbot belongs to user's organization
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: params.id,
        organizationId: { in: userOrganizationIds },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Get context blocks for the chatbot
    const contextBlocks = await prisma.contextBlock.findMany({
      where: { chatbotId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contextBlocks);
  } catch (error) {
    console.error("Error fetching context blocks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/chatbots/[id]/context-blocks - Create a new context block
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, type, metadata } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
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

    // Get user organization IDs
    const userOrganizationIds = user.organizations.map((org) => org.id);

    // Verify chatbot belongs to user's organization
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: params.id,
        organizationId: { in: userOrganizationIds },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Create context block
    const contextBlock = await prisma.contextBlock.create({
      data: {
        title,
        content,
        type: type || "TEXT",
        metadata: metadata || null,
        chatbotId: params.id,
      },
    });

    // TODO: Here you would integrate with your vector database
    // For example, generate embeddings and store the vectorId
    // const vectorId = await generateAndStoreEmbeddings(contextBlock);
    // await prisma.contextBlock.update({
    //   where: { id: contextBlock.id },
    //   data: { vectorId },
    // });

    return NextResponse.json(contextBlock, { status: 201 });
  } catch (error) {
    console.error("Error creating context block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
