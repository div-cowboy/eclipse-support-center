/**
 * API Routes for Ticket Responses
 * POST /api/tickets/[id]/responses - Add response to ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { addResponse } from "@/lib/ticket-service";
import { ResponseAuthorType } from "@prisma/client";

/**
 * POST /api/tickets/[id]/responses
 * Add a response to a ticket
 */
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

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const response = await addResponse({
      ticketId: params.id,
      content: body.content,
      isInternal: body.isInternal || false,
      authorId: session.user.id,
      authorEmail: session.user.email || "unknown@example.com",
      authorName: session.user.name || "Unknown User",
      authorType: ResponseAuthorType.AGENT,
    });

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error: any) {
    console.error("Error adding response:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add response" },
      { status: 500 }
    );
  }
}
