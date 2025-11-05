import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chatbots/[id]/context-blocks/[blockId] - Get a specific context block
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const { id, blockId } = await params;
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

    // Get the specific context block
    const contextBlock = await prisma.contextBlock.findFirst({
      where: {
        id: blockId,
        chatbot: {
          id: id,
          organizationId: { in: userOrganizationIds },
        },
      },
    });

    if (!contextBlock) {
      return NextResponse.json(
        { error: "Context block not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contextBlock);
  } catch (error) {
    console.error("Error fetching context block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/chatbots/[id]/context-blocks/[blockId] - Update a context block
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const { id, blockId } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, type, metadata } = body;

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

    // Check if context block exists and belongs to user's organization
    const existingContextBlock = await prisma.contextBlock.findFirst({
      where: {
        id: blockId,
        chatbot: {
          id: id,
          organizationId: { in: userOrganizationIds },
        },
      },
    });

    if (!existingContextBlock) {
      return NextResponse.json(
        { error: "Context block not found" },
        { status: 404 }
      );
    }

    // Update context block
    const contextBlock = await prisma.contextBlock.update({
      where: { id: blockId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(metadata !== undefined && { metadata }),
      },
    });

    // TODO: Update vector database if content changed
    // if (content && content !== existingContextBlock.content) {
    //   await updateVectorEmbeddings(contextBlock);
    // }

    return NextResponse.json(contextBlock);
  } catch (error) {
    console.error("Error updating context block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/chatbots/[id]/context-blocks/[blockId] - Delete a context block
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const { id, blockId } = await params;
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

    // Check if context block exists and belongs to user's organization
    const existingContextBlock = await prisma.contextBlock.findFirst({
      where: {
        id: blockId,
        chatbot: {
          id: id,
          organizationId: { in: userOrganizationIds },
        },
      },
    });

    if (!existingContextBlock) {
      return NextResponse.json(
        { error: "Context block not found" },
        { status: 404 }
      );
    }

    // TODO: Delete from vector database if vectorId exists
    // if (existingContextBlock.vectorId) {
    //   await deleteVectorEmbeddings(existingContextBlock.vectorId);
    // }

    // Delete context block
    await prisma.contextBlock.delete({
      where: { id: blockId },
    });

    return NextResponse.json({ message: "Context block deleted successfully" });
  } catch (error) {
    console.error("Error deleting context block:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
