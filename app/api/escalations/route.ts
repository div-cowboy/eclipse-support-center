import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/escalations - Log an escalation request when user wants to speak to a human
 * This endpoint tracks escalations for analytics and can trigger notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatbotId, reason, messages, timestamp } = body;

    if (!chatbotId) {
      return NextResponse.json(
        { error: "chatbotId is required" },
        { status: 400 }
      );
    }

    // Log the escalation to console (you can extend this to store in DB or send notifications)
    console.log("🚨 ESCALATION REQUESTED:", {
      chatbotId,
      reason,
      timestamp: timestamp || new Date().toISOString(),
      messageCount: messages?.length || 0,
    });

    // Verify chatbot exists
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // TODO: Here you can:
    // 1. Store escalation in database
    // 2. Send email notification to support team
    // 3. Create a ticket in your support system
    // 4. Trigger a webhook to your CRM
    // 5. Send SMS/Slack notification to on-call support

    // Example: Log escalation details
    console.log("Escalation Details:", {
      organization: chatbot.organization.name,
      chatbot: chatbot.name,
      reason,
      conversationSnippet: messages
        ?.slice(-3)
        .map(
          (m: { role: string; content: string }) => `${m.role}: ${m.content}`
        )
        .join("\n"),
    });

    return NextResponse.json({
      success: true,
      message: "Escalation logged successfully",
      escalation: {
        chatbotId,
        chatbotName: chatbot.name,
        organizationName: chatbot.organization.name,
        reason,
        timestamp: timestamp || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error logging escalation:", error);
    return NextResponse.json(
      {
        error: "Failed to log escalation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/escalations - Get escalation statistics (optional, for admin dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Implement escalation statistics
    // This could return:
    // - Total escalations by chatbot
    // - Escalations by time period
    // - Most common escalation reasons
    // - Response times

    return NextResponse.json({
      message: "Escalation statistics endpoint - to be implemented",
      // Example structure:
      // statistics: {
      //   totalEscalations: 0,
      //   byPeriod: {},
      //   byChatbot: {},
      // }
    });
  } catch (error) {
    console.error("Error fetching escalation statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch escalation statistics" },
      { status: 500 }
    );
  }
}
