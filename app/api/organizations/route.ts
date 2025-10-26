import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
// import { Organization } from "@prisma/client";

// GET /api/organizations - Get all organizations for the current user
export async function GET() {
  try {
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

    // Get all organizations that the user is a member of
    const organizations = await prisma.organization.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, slug, documents } = body;

    console.log("Received organization creation request:", {
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

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization slug already exists" },
        { status: 400 }
      );
    }

    // Create organization with the user as a member
    const organization = await prisma.organization.create({
      data: {
        name,
        description: description || null,
        slug,
        users: {
          connect: { id: user.id },
        },
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

    // Create documents if provided
    let createdDocuments: Array<{
      id: string;
      title: string;
      content: string;
      type: string;
    }> = [];
    if (documents && Array.isArray(documents) && documents.length > 0) {
      try {
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
                    ? JSON.stringify(doc.metadata)
                    : undefined,
                  organizationId: organization.id,
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
        }>;

        console.log(
          `Created ${createdDocuments.length} documents for organization ${organization.id}`
        );
      } catch (docError) {
        console.error("Error creating documents:", docError);
        // Don't fail the entire organization creation if documents fail
        // The organization is already created, so we'll log the error but continue
      }

      // Generate and store vector embeddings for created documents
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
                const vectorId =
                  await vectorService.createOrganizationDocumentEmbedding(
                    doc.id,
                    doc.title,
                    doc.content,
                    doc.type,
                    organization.id
                  );
                await prisma.organizationDocument.update({
                  where: { id: doc.id },
                  data: { vectorId },
                });
              }
            }
            console.log(
              `Generated vector embeddings for ${createdDocuments.length} documents`
            );
          } else {
            console.warn(
              "Vector database not available - documents stored without embeddings"
            );
          }
        } catch (vectorError) {
          console.error("Error generating vector embeddings:", vectorError);
          // Don't fail the organization creation if vector storage fails
        }
      }
    }

    // Index organization description in vector database
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
          await vectorService.createOrganizationDescriptionEmbedding(
            organization.id,
            organization.name,
            organization.description
          );
          console.log(
            `Generated vector embedding for organization description: ${organization.id}`
          );
        } else {
          console.warn(
            "Vector database not available - organization description not indexed"
          );
        }
      } catch (vectorError) {
        console.error(
          "Error generating organization description embedding:",
          vectorError
        );
        // Don't fail the organization creation if vector storage fails
      }
    }

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
