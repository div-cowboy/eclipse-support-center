/**
 * API Routes for Tickets
 * POST /api/tickets - Create a new ticket
 * GET /api/tickets - List tickets with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import {
  createTicket,
  listTickets,
  type CreateTicketInput,
  type TicketFilters,
} from "@/lib/ticket-service";
import { TicketPriority, TicketStatus } from "@prisma/client";

/**
 * POST /api/tickets
 * Create a new ticket (manual creation by agent/admin)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    if (!body.subject) {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    }

    if (!body.description) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    if (!body.requesterName) {
      return NextResponse.json(
        { error: "requesterName is required" },
        { status: 400 }
      );
    }

    if (!body.requesterEmail) {
      return NextResponse.json(
        { error: "requesterEmail is required" },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (body.priority && !Object.values(TicketPriority).includes(body.priority)) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      );
    }

    // Create ticket
    const ticketInput: CreateTicketInput = {
      organizationId: body.organizationId,
      subject: body.subject,
      description: body.description,
      priority: body.priority,
      category: body.category,
      requesterName: body.requesterName,
      requesterEmail: body.requesterEmail,
      requesterId: body.requesterId,
      assignedToId: body.assignedToId,
      tags: body.tags,
      customFields: body.customFields,
      metadata: {
        ...body.metadata,
        createdBy: session.user.id,
        createdByEmail: session.user.email,
        source: body.metadata?.source || "manual",
      },
      originChatId: body.originChatId,
    };

    const ticket = await createTicket(ticketInput);

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        requesterName: ticket.requesterName,
        requesterEmail: ticket.requesterEmail,
        assignedToId: ticket.assignedToId,
        organizationId: ticket.organizationId,
        originChatId: ticket.originChatId,
        createdAt: ticket.createdAt,
        viewUrl: `/app/tickets/${ticket.id}`,
      },
    });
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create ticket" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tickets
 * List tickets with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedToId = searchParams.get("assignedToId");
    const requesterId = searchParams.get("requesterId");
    const category = searchParams.get("category");
    const tags = searchParams.get("tags");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Parse multi-value filters
    let statusFilter: TicketStatus | TicketStatus[] | undefined;
    if (status) {
      const statusValues = status.split(",") as TicketStatus[];
      statusFilter = statusValues.length === 1 ? statusValues[0] : statusValues;
    }

    let priorityFilter: TicketPriority | TicketPriority[] | undefined;
    if (priority) {
      const priorityValues = priority.split(",") as TicketPriority[];
      priorityFilter = priorityValues.length === 1 ? priorityValues[0] : priorityValues;
    }

    let tagsFilter: string[] | undefined;
    if (tags) {
      tagsFilter = tags.split(",");
    }

    // Build filters
    const filters: TicketFilters = {
      organizationId,
      status: statusFilter,
      priority: priorityFilter,
      assignedToId: assignedToId || undefined,
      requesterId: requesterId || undefined,
      category: category || undefined,
      tags: tagsFilter,
      search: search || undefined,
      page,
      limit: Math.min(limit, 100), // Cap at 100
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    const result = await listTickets(filters);

    return NextResponse.json({
      success: true,
      tickets: result.tickets,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error listing tickets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list tickets" },
      { status: 500 }
    );
  }
}

