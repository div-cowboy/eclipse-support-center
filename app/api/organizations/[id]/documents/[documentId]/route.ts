import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationDocumentVectorService } from "@/lib/vector-db";

// GET /api/organizations/[id]/documents/[documentId] - Get a specific document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
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

    // Verify organization belongs to user
    const userOrganizationIds = user.organizations.map((org) => org.id);
    if (!userOrganizationIds.includes(params.id)) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get the specific document
    const document = await prisma.organizationDocument.findFirst({
      where: {
        id: params.documentId,
        organizationId: params.id,
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching organization document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[id]/documents/[documentId] - Update a document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
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

    // Verify organization belongs to user
    const userOrganizationIds = user.organizations.map((org) => org.id);
    if (!userOrganizationIds.includes(params.id)) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find and update the document
    const document = await prisma.organizationDocument.findFirst({
      where: {
        id: params.documentId,
        organizationId: params.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update the document
    const updatedDocument = await prisma.organizationDocument.update({
      where: { id: params.documentId },
      data: {
        title,
        content,
        type: type || document.type,
        metadata: metadata || document.metadata,
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // TODO: Update vector embeddings if content changed
    // if (document.content !== content || document.title !== title) {
    //   const vectorService = new OrganizationDocumentVectorService(vectorDB);
    //   if (document.vectorId) {
    //     await vectorService.updateOrganizationDocumentEmbedding(
    //       document.vectorId,
    //       document.id,
    //       title,
    //       content,
    //       type || document.type,
    //       params.id
    //     );
    //   } else {
    //     // Create new vector if none exists
    //     const vectorId = await vectorService.createOrganizationDocumentEmbedding(
    //       document.id,
    //       title,
    //       content,
    //       type || document.type,
    //       params.id
    //     );
    //     await prisma.organizationDocument.update({
    //       where: { id: document.id },
    //       data: { vectorId },
    //     });
    //   }
    // }

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Error updating organization document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id]/documents/[documentId] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
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

    // Verify organization belongs to user
    const userOrganizationIds = user.organizations.map((org) => org.id);
    if (!userOrganizationIds.includes(params.id)) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find the document
    const document = await prisma.organizationDocument.findFirst({
      where: {
        id: params.documentId,
        organizationId: params.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // TODO: Delete vector embeddings if they exist
    // if (document.vectorId) {
    //   const vectorService = new OrganizationDocumentVectorService(vectorDB);
    //   await vectorService.deleteOrganizationDocumentEmbedding(document.vectorId);
    // }

    // Delete the document
    await prisma.organizationDocument.delete({
      where: { id: params.documentId },
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting organization document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
