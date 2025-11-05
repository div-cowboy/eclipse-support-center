/**
 * Ticket Service
 * Handles all business logic for support tickets
 */

import { prisma } from "./prisma";
import {
  Ticket,
  TicketResponse,
  TicketActivity,
  TicketStatus,
  TicketPriority,
  TicketActivityType,
  ResponseAuthorType,
} from "@prisma/client";
import { format } from "date-fns";
import { sendTicketResponseEmail } from "./mailgun-service";

// Types
export interface CreateTicketInput {
  organizationId: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: string;
  requesterName: string;
  requesterEmail: string;
  requesterId?: string; // Optional: link to existing user
  assignedToId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  metadata?: Record<string, any>;
  originChatId?: string; // Optional: link to originating chat
  originFormId?: string; // Optional: link to originating form
}

export interface CreateTicketFromChatInput {
  chatId: string;
  subject?: string; // Optional override
  priority?: TicketPriority;
  category?: string;
  includeTranscript?: boolean;
  includeAttachments?: boolean;
  autoAssignToAgent?: boolean;
  tags?: string[];
  currentUserId?: string; // The agent creating the ticket
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedToId?: string | null;
  tags?: string[];
  customFields?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AddResponseInput {
  ticketId: string;
  content: string;
  isInternal?: boolean;
  sendEmail?: boolean;
  authorId?: string;
  authorEmail: string;
  authorName: string;
  authorType?: ResponseAuthorType;
}

export interface TicketFilters {
  organizationId: string;
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  assignedToId?: string;
  requesterId?: string;
  category?: string;
  tags?: string[];
  search?: string; // Search in subject, description, requester name
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "priority" | "ticketNumber";
  sortOrder?: "asc" | "desc";
}

/**
 * Create a new ticket
 */
export async function createTicket(
  input: CreateTicketInput
): Promise<Ticket> {
  const ticket = await prisma.ticket.create({
    data: {
      organizationId: input.organizationId,
      subject: input.subject,
      description: input.description,
      priority: input.priority || TicketPriority.MEDIUM,
      status: TicketStatus.NEW,
      category: input.category,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      requesterId: input.requesterId,
      assignedToId: input.assignedToId,
      tags: input.tags || [],
      customFields: input.customFields || {},
      metadata: input.metadata || {},
      originChatId: input.originChatId,
      originFormId: input.originFormId,
    },
    include: {
      organization: true,
      requester: true,
      assignedTo: true,
      originChat: true,
      originForm: true,
    },
  });

  // Create activity log
  await createActivity({
    ticketId: ticket.id,
    activityType: TicketActivityType.CREATED,
    description: `Ticket created${
      ticket.originChatId
        ? " from chat"
        : ticket.originFormId
        ? " from form"
        : ""
    }`,
    performedById: input.requesterId || input.assignedToId,
    performedByName: input.requesterName,
  });

  // If assigned, create assignment activity
  if (input.assignedToId) {
    await createActivity({
      ticketId: ticket.id,
      activityType: TicketActivityType.ASSIGNED,
      description: `Ticket assigned to ${ticket.assignedTo?.name || "agent"}`,
      performedById: input.assignedToId,
      performedByName: ticket.assignedTo?.name || "System",
      changes: {
        assignedToId: { from: null, to: input.assignedToId },
      },
    });
  }

  return ticket;
}

/**
 * Create a ticket from an existing chat conversation
 */
export async function createTicketFromChat(
  input: CreateTicketFromChatInput
): Promise<Ticket> {
  // Fetch the chat with messages
  const chat = await prisma.chat.findUnique({
    where: { id: input.chatId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          user: true,
        },
      },
      chatbot: {
        include: {
          organization: true,
        },
      },
      assignedTo: true,
    },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (!chat.chatbot) {
    throw new Error("Chat has no associated chatbot");
  }

  // Extract requester info from first user message
  const firstUserMessage = chat.messages.find((m) => m.role === "USER");
  const requesterName = firstUserMessage?.user?.name || "Anonymous User";
  const requesterEmail =
    firstUserMessage?.user?.email || `chat-${chat.id}@temp.example.com`;
  const requesterId = firstUserMessage?.userId || undefined;

  // Generate chat transcript if requested
  let description = input.includeTranscript
    ? await formatChatTranscript(chat.id)
    : chat.description || chat.title;

  // Use chat title as subject if not overridden
  const subject = input.subject || chat.title || "Issue from chat";

  // Suggest priority based on escalation status
  const priority =
    input.priority ||
    (chat.escalationRequested ? TicketPriority.HIGH : TicketPriority.MEDIUM);

  // Determine assignee
  const assignedToId =
    input.autoAssignToAgent && input.currentUserId
      ? input.currentUserId
      : chat.assignedToId || undefined;

  // Build tags
  const tags = input.tags || [];
  if (chat.escalationRequested) {
    tags.push("escalated-from-chat");
  }
  if (chat.escalationReason) {
    tags.push(chat.escalationReason);
  }

  // Create the ticket
  const ticket = await createTicket({
    organizationId: chat.chatbot.organizationId,
    subject,
    description,
    priority,
    category: input.category,
    requesterName,
    requesterEmail,
    requesterId,
    assignedToId,
    tags,
    originChatId: chat.id,
    metadata: {
      source: "chat",
      chatId: chat.id,
      escalationRequested: chat.escalationRequested,
      escalationReason: chat.escalationReason,
    },
  });

  return ticket;
}

/**
 * Format chat messages into a readable transcript
 */
export async function formatChatTranscript(chatId: string): Promise<string> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          user: true,
        },
      },
    },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  const transcript = chat.messages
    .map((msg) => {
      const timestamp = format(
        new Date(msg.createdAt),
        "MMM dd, yyyy HH:mm"
      );
      const role =
        msg.role === "USER"
          ? "Customer"
          : msg.role === "AGENT"
          ? "Agent"
          : msg.role === "ASSISTANT"
          ? "Bot"
          : "System";
      const name = msg.user?.name || role;
      return `[${timestamp}] ${name}: ${msg.content}`;
    })
    .join("\n\n");

  return `--- Chat Transcript ---\n\n${transcript}\n\n--- End of Transcript ---`;
}

/**
 * Get a single ticket with all related data
 */
export async function getTicket(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      organization: true,
      requester: true,
      assignedTo: true,
      originChat: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 5, // Preview of first 5 messages
          },
        },
      },
      originForm: {
        select: {
          id: true,
          name: true,
          embedCode: true,
        },
      },
      responses: {
        orderBy: { createdAt: "desc" },
        include: {
          author: true,
          attachments: true,
        },
      },
      attachments: true,
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          performedBy: true,
        },
      },
    },
  });
}

/**
 * List tickets with filters and pagination
 */
export async function listTickets(filters: TicketFilters) {
  const {
    organizationId,
    status,
    priority,
    assignedToId,
    requesterId,
    category,
    tags,
    search,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  // Build where clause
  const where: any = {
    organizationId,
  };

  if (status) {
    where.status = Array.isArray(status) ? { in: status } : status;
  }

  if (priority) {
    where.priority = Array.isArray(priority) ? { in: priority } : priority;
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (requesterId) {
    where.requesterId = requesterId;
  }

  if (category) {
    where.category = category;
  }

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { requesterName: { contains: search, mode: "insensitive" } },
      { requesterEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  // Count total
  const total = await prisma.ticket.count({ where });

  // Fetch tickets
  const tickets = await prisma.ticket.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      requester: true,
      assignedTo: true,
      originChat: true,
      originForm: {
        select: {
          id: true,
          name: true,
          embedCode: true,
        },
      },
      _count: {
        select: {
          responses: true,
          activities: true,
        },
      },
    },
  });

  return {
    tickets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update a ticket
 */
export async function updateTicket(
  ticketId: string,
  input: UpdateTicketInput,
  performedById?: string
) {
  const currentTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { assignedTo: true },
  });

  if (!currentTicket) {
    throw new Error("Ticket not found");
  }

  // Track changes for activity log
  const changes: any = {};
  let activityDescription = "Ticket updated";
  let activityType = TicketActivityType.STATUS_CHANGED;

  if (input.status && input.status !== currentTicket.status) {
    changes.status = { from: currentTicket.status, to: input.status };
    activityDescription = `Status changed from ${currentTicket.status} to ${input.status}`;
    activityType = TicketActivityType.STATUS_CHANGED;

    if (input.status === TicketStatus.RESOLVED) {
      activityType = TicketActivityType.RESOLVED;
    } else if (input.status === TicketStatus.CLOSED) {
      activityType = TicketActivityType.CLOSED;
    }
  }

  if (input.priority && input.priority !== currentTicket.priority) {
    changes.priority = { from: currentTicket.priority, to: input.priority };
    activityDescription = `Priority changed from ${currentTicket.priority} to ${input.priority}`;
    activityType = TicketActivityType.PRIORITY_CHANGED;
  }

  if (
    input.assignedToId !== undefined &&
    input.assignedToId !== currentTicket.assignedToId
  ) {
    changes.assignedToId = {
      from: currentTicket.assignedToId,
      to: input.assignedToId,
    };
    activityDescription = input.assignedToId
      ? `Ticket assigned`
      : `Ticket unassigned`;
    activityType = input.assignedToId
      ? TicketActivityType.ASSIGNED
      : TicketActivityType.UNASSIGNED;
  }

  // Update ticket
  const updateData: any = {
    ...input,
  };

  // Set resolved/closed timestamps
  if (input.status === TicketStatus.RESOLVED && !currentTicket.resolvedAt) {
    updateData.resolvedAt = new Date();
  }

  if (input.status === TicketStatus.CLOSED && !currentTicket.closedAt) {
    updateData.closedAt = new Date();
  }

  if (input.assignedToId !== undefined) {
    updateData.assignedAt = input.assignedToId ? new Date() : null;
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: updateData,
    include: {
      organization: true,
      requester: true,
      assignedTo: true,
      originChat: true,
      originForm: {
        select: {
          id: true,
          name: true,
          embedCode: true,
        },
      },
    },
  });

  // Create activity log if there are changes
  if (Object.keys(changes).length > 0) {
    const performer = performedById
      ? await prisma.user.findUnique({ where: { id: performedById } })
      : null;

    await createActivity({
      ticketId: ticket.id,
      activityType,
      description: activityDescription,
      performedById,
      performedByName: performer?.name || "System",
      changes,
    });
  }

  return ticket;
}

/**
 * Add a response to a ticket
 */
export async function addResponse(
  input: AddResponseInput
): Promise<TicketResponse> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const response = await prisma.ticketResponse.create({
    data: {
      ticketId: input.ticketId,
      content: input.content,
      isInternal: input.isInternal || false,
      authorId: input.authorId,
      authorEmail: input.authorEmail,
      authorName: input.authorName,
      authorType: input.authorType || ResponseAuthorType.AGENT,
    },
    include: {
      author: true,
      attachments: true,
    },
  });

  // Update first response time if this is the first response
  if (!ticket.firstResponseAt) {
    await prisma.ticket.update({
      where: { id: input.ticketId },
      data: { firstResponseAt: new Date() },
    });
  }

  // Create activity log
  await createActivity({
    ticketId: input.ticketId,
    activityType: input.isInternal
      ? TicketActivityType.INTERNAL_NOTE_ADDED
      : TicketActivityType.RESPONDED,
    description: input.isInternal
      ? "Internal note added"
      : "Response added to ticket",
    performedById: input.authorId,
    performedByName: input.authorName,
  });

  // Send email to customer if requested and not internal
  if (input.sendEmail && !input.isInternal) {
    try {
      // Generate ticket URL (you may want to make this configurable)
      const ticketUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/app/tickets/${input.ticketId}`
        : undefined;

      const emailResult = await sendTicketResponseEmail(
        ticket.ticketNumber,
        ticket.subject,
        ticket.requesterName,
        ticket.requesterEmail,
        input.content,
        input.authorName,
        ticketUrl,
        ticket.id // Pass ticketId for reply-to address
      );

      // Update response with email tracking
      await prisma.ticketResponse.update({
        where: { id: response.id },
        data: {
          isEmailSent: true,
          emailMessageId: emailResult.id || emailResult.message || undefined,
        },
      });

      // Create activity log for email sent
      await createActivity({
        ticketId: input.ticketId,
        activityType: TicketActivityType.RESPONDED,
        description: "Email notification sent to customer",
        performedById: input.authorId,
        performedByName: input.authorName,
      });
    } catch (error: any) {
      // Log error but don't fail the response creation
      console.error("Error sending email notification:", error);
      // You might want to create an activity log for this error
    }
  }

  return response;
}

/**
 * Link a ticket to a chat (for additional related chats)
 */
export async function linkTicketToChat(ticketId: string, chatId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  // Add chat to linkedChatIds if not already there
  const linkedChatIds = ticket.linkedChatIds || [];
  if (!linkedChatIds.includes(chatId) && ticket.originChatId !== chatId) {
    linkedChatIds.push(chatId);

    return prisma.ticket.update({
      where: { id: ticketId },
      data: { linkedChatIds },
    });
  }

  return ticket;
}

/**
 * Create a ticket activity log entry
 */
async function createActivity(input: {
  ticketId: string;
  activityType: TicketActivityType;
  description: string;
  performedById?: string;
  performedByName: string;
  changes?: Record<string, any>;
}): Promise<TicketActivity> {
  return prisma.ticketActivity.create({
    data: {
      ticketId: input.ticketId,
      activityType: input.activityType,
      description: input.description,
      performedById: input.performedById,
      performedByName: input.performedByName,
      changes: input.changes || {},
    },
  });
}

/**
 * Get ticket statistics for an organization
 */
export async function getTicketStats(organizationId: string) {
  const [
    totalTickets,
    newTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
    highPriorityTickets,
    urgentTickets,
  ] = await Promise.all([
    prisma.ticket.count({ where: { organizationId } }),
    prisma.ticket.count({
      where: { organizationId, status: TicketStatus.NEW },
    }),
    prisma.ticket.count({
      where: { organizationId, status: TicketStatus.OPEN },
    }),
    prisma.ticket.count({
      where: { organizationId, status: TicketStatus.IN_PROGRESS },
    }),
    prisma.ticket.count({
      where: { organizationId, status: TicketStatus.RESOLVED },
    }),
    prisma.ticket.count({
      where: { organizationId, status: TicketStatus.CLOSED },
    }),
    prisma.ticket.count({
      where: { organizationId, priority: TicketPriority.HIGH },
    }),
    prisma.ticket.count({
      where: {
        organizationId,
        priority: { in: [TicketPriority.URGENT, TicketPriority.CRITICAL] },
      },
    }),
  ]);

  return {
    total: totalTickets,
    byStatus: {
      new: newTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets,
    },
    byPriority: {
      high: highPriorityTickets,
      urgent: urgentTickets,
    },
  };
}

