import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationDocumentVectorService } from "@/lib/vector-db";

// GET /api/organizations/[id]/documents - Get all documents for an organization
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
    if (!userOrganizationIds.includes(id)) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get documents for the organization
    const documents = await prisma.organizationDocument.findMany({
      where: { organizationId: id },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching organization documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[id]/documents - Create a new organization document
export async function POST(
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
    if (!userOrganizationIds.includes(id)) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Create organization document
    const document = await prisma.organizationDocument.create({
      data: {
        title,
        content,
        type: type || "TEXT",
        metadata: metadata || null,
        organizationId: id,
        uploadedBy: user.id,
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Generate and store vector embeddings
    try {
      const { initializeVectorDatabase } = await import("@/lib/vector-config");
      const { OrganizationDocumentVectorService } = await import(
        "@/lib/vector-db"
      );

      const vectorDB = await initializeVectorDatabase();
      if (vectorDB) {
        const vectorService = new OrganizationDocumentVectorService(vectorDB);
        const vectorId =
          await vectorService.createOrganizationDocumentEmbedding(
            document.id,
            title,
            content,
            type || "TEXT",
            id
          );

        // Update document with vector ID
        await prisma.organizationDocument.update({
          where: { id: document.id },
          data: { vectorId },
        });

        console.log(
          `Generated vector embedding for document ${document.id}: ${vectorId}`
        );
      } else {
        console.warn(
          "Vector database not available - document stored without embeddings"
        );
      }
    } catch (vectorError) {
      console.error("Error generating vector embeddings:", vectorError);
      // Don't fail the document creation if vector storage fails
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating organization document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
