import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET /api/organizations/[id] - Get a specific organization
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

    // Get user first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the organization and verify user has access
    const organization = await prisma.organization.findFirst({
      where: {
        id: id,
        users: {
          some: {
            id: user.id,
          },
        },
      },
      include: {
        users: {
          select: { id: true },
        },
        chatbots: {
          select: { id: true },
        },
        documents: {
          select: {
            id: true,
            title: true,
            content: true,
            type: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[id] - Update a specific organization
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
    const { name, description, slug, documents } = body;

    console.log("Received organization update request:", {
      id: id,
      name,
      description,
      slug,
      documentsCount: documents?.length || 0,
    });

    if (!name || !slug) {
      console.log("Validation failed - missing name or slug:", { name, slug });
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user has access to this organization
    const existingOrg = await prisma.organization.findFirst({
      where: {
        id: id,
        users: {
          some: {
            id: user.id,
          },
        },
      },
    });

    if (!existingOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if slug is already taken by another organization
    const slugConflict = await prisma.organization.findFirst({
      where: {
        slug,
        id: { not: id },
      },
    });

    if (slugConflict) {
      return NextResponse.json(
        { error: "Organization slug already exists" },
        { status: 400 }
      );
    }

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: id },
      data: {
        name,
        description: description || null,
        slug,
      },
      include: {
        users: {
          select: { id: true },
        },
        chatbots: {
          select: { id: true },
        },
      },
    });

    // Handle documents if provided
    let createdDocuments: Array<{
      id: string;
      title: string;
      content: string;
      type: string;
      vectorId?: string;
    }> = [];

    if (documents && Array.isArray(documents) && documents.length > 0) {
      try {
        // Delete existing documents for this organization
        await prisma.organizationDocument.deleteMany({
          where: { organizationId: id },
        });

        // Create new documents
        const documentPromises = documents.map(
          (doc: {
            title: string;
            content: string;
            type?: string;
            metadata?: Record<string, unknown>;
          }) => {
            if (doc.title && doc.content) {
              return prisma.organizationDocument.create({
                data: {
                  title: doc.title,
                  content: doc.content,
                  type:
                    (doc.type as
                      | "TEXT"
                      | "POLICY"
                      | "PROCEDURE"
                      | "MANUAL"
                      | "GUIDE"
                      | "FAQ"
                      | "ANNOUNCEMENT") || "TEXT",
                  metadata: doc.metadata
                    ? JSON.parse(JSON.stringify(doc.metadata))
                    : undefined,
                  organizationId: id,
                  uploadedBy: user.id,
                },
              });
            }
            return null;
          }
        );

        createdDocuments = (await Promise.all(
          documentPromises.filter(Boolean)
        )) as Array<{
          id: string;
          title: string;
          content: string;
          type: string;
          vectorId?: string;
        }>;

        console.log(
          `Updated ${createdDocuments.length} documents for organization ${id}`
        );
      } catch (docError) {
        console.error("Error updating documents:", docError);
        // Don't fail the entire organization update if documents fail
      }

      // Update vector embeddings for updated documents
      if (createdDocuments.length > 0) {
        try {
          const { initializeVectorDatabase } = await import(
            "@/lib/vector-config"
          );
          const { OrganizationDocumentVectorService } = await import(
            "@/lib/vector-db"
          );

          const vectorDB = await initializeVectorDatabase();
          if (vectorDB) {
            const vectorService = new OrganizationDocumentVectorService(
              vectorDB
            );
            for (const doc of createdDocuments) {
              if (doc) {
                // Delete old vector if it exists
                if (doc.vectorId) {
                  await vectorService.deleteOrganizationDocumentEmbedding(
                    doc.vectorId
                  );
                }

                // Create new vector embedding
                const vectorId =
                  await vectorService.createOrganizationDocumentEmbedding(
                    doc.id,
                    doc.title,
                    doc.content,
                    doc.type,
                    id
                  );
                await prisma.organizationDocument.update({
                  where: { id: doc.id },
                  data: { vectorId },
                });
              }
            }
            console.log(
              `Updated vector embeddings for ${createdDocuments.length} documents`
            );
          } else {
            console.warn(
              "Vector database not available - documents updated without embeddings"
            );
          }
        } catch (vectorError) {
          console.error("Error updating vector embeddings:", vectorError);
          // Don't fail the organization update if vector storage fails
        }
      }
    }

    // Update organization description vector embedding
    if (organization.description) {
      try {
        const { initializeVectorDatabase } = await import(
          "@/lib/vector-config"
        );
        const { OrganizationDescriptionVectorService } = await import(
          "@/lib/vector-db"
        );

        const vectorDB = await initializeVectorDatabase();
        if (vectorDB) {
          const vectorService = new OrganizationDescriptionVectorService(
            vectorDB
          );

          // Check if there's an existing vector for this organization description
          const existingVectorId = `org_desc_${id}`;

          // Update the vector embedding
          await vectorService.updateOrganizationDescriptionEmbedding(
            existingVectorId,
            id,
            organization.name,
            organization.description
          );
          console.log(
            `Updated vector embedding for organization description: ${id}`
          );
        } else {
          console.warn(
            "Vector database not available - organization description not updated"
          );
        }
      } catch (vectorError) {
        console.error(
          "Error updating organization description embedding:",
          vectorError
        );
        // Don't fail the organization update if vector storage fails
      }
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id] - Delete a specific organization
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user has access to this organization
    const existingOrg = await prisma.organization.findFirst({
      where: {
        id: id,
        users: {
          some: {
            id: user.id,
          },
        },
      },
    });

    if (!existingOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Delete organization (this will cascade delete related records)
    await prisma.organization.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
