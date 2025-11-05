/**
 * API Routes for Single Ticket
 * GET /api/tickets/[id] - Get ticket details
 * PATCH /api/tickets/[id] - Update ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { getTicket, updateTicket } from "@/lib/ticket-service";
import { TicketPriority, TicketStatus } from "@prisma/client";

/**
 * GET /api/tickets/[id]
 * Get a single ticket with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tickets/[id]
 * Update a ticket
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate status if provided
    if (body.status && !Object.values(TicketStatus).includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (
      body.priority &&
      !Object.values(TicketPriority).includes(body.priority)
    ) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      );
    }

    const ticket = await updateTicket(id, body, session.user.id);

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}
