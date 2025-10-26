import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// POST /api/organizations/[id]/documents/search - Search organization documents semantically
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
    const { query, topK = 10 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
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
    const organization = await prisma.organization.findFirst({
      where: {
        id: params.id,
        users: {
          some: {
            id: user.id,
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

    // Initialize vector database and search
    try {
      const { initializeVectorDatabase } = await import("@/lib/vector-config");
      const { OrganizationDocumentVectorService } = await import(
        "@/lib/vector-db"
      );

      const vectorDB = await initializeVectorDatabase();
      if (!vectorDB) {
        return NextResponse.json(
          { error: "Vector database not available" },
          { status: 503 }
        );
      }

      const vectorService = new OrganizationDocumentVectorService(vectorDB);
      const searchResults = await vectorService.searchOrganizationDocuments(
        query,
        params.id,
        topK
      );

      // Get full document details for the search results
      const documentIds = searchResults.map(
        (result) => result.metadata.contextBlockId
      );

      const documents = await prisma.organizationDocument.findMany({
        where: {
          id: { in: documentIds },
          organizationId: params.id,
        },
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          metadata: true,
          createdAt: true,
        },
      });

      // Combine search results with document details
      const enrichedResults = searchResults
        .map((result) => {
          const document = documents.find(
            (doc) => doc.id === result.metadata.contextBlockId
          );
          return {
            id: result.id,
            score: result.score,
            document: document || null,
            metadata: result.metadata,
          };
        })
        .filter((result) => result.document !== null);

      return NextResponse.json({
        query,
        results: enrichedResults,
        totalResults: enrichedResults.length,
      });
    } catch (vectorError) {
      console.error("Error performing vector search:", vectorError);
      return NextResponse.json(
        { error: "Search service temporarily unavailable" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error searching organization documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
