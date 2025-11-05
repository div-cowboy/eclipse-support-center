/**
 * API Route for Creating Ticket from Chat
 * POST /api/tickets/from-chat/[chatId] - Create ticket from existing chat
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import {
  createTicketFromChat,
  type CreateTicketFromChatInput,
} from "@/lib/ticket-service";
import { TicketPriority } from "@prisma/client";

/**
 * POST /api/tickets/from-chat/[chatId]
 * Create a ticket from an existing chat conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    const { chatId } = await params;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

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

    // Create ticket from chat
    const input: CreateTicketFromChatInput = {
      chatId: chatId,
      subject: body.subject,
      priority: body.priority,
      category: body.category,
      includeTranscript: body.includeTranscript !== false, // Default to true
      includeAttachments: body.includeAttachments || false,
      autoAssignToAgent: body.autoAssignToAgent || false,
      tags: body.tags,
      currentUserId: session.user.id,
    };

    const ticket = await createTicketFromChat(input);

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        originChatId: ticket.originChatId,
        requesterName: ticket.requesterName,
        requesterEmail: ticket.requesterEmail,
        assignedToId: ticket.assignedToId,
        createdAt: ticket.createdAt,
        viewUrl: `/app/tickets/${ticket.id}`,
      },
    });
  } catch (error: any) {
    console.error("Error creating ticket from chat:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create ticket from chat" },
      { status: 500 }
    );
  }
}
