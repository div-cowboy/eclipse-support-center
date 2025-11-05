/**
 * Mailgun Webhook Handler
 * Receives inbound emails from Mailgun and creates ticket responses
 * 
 * POST /api/webhooks/mailgun
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyMailgunSignature,
  extractTicketIdFromEmail,
  extractEmailContent,
  parseEmailHeaders,
  parseSenderFromHeader,
  type MailgunInboundEmail,
} from "@/lib/mailgun-webhook";
import { addResponse } from "@/lib/ticket-service";
import { prisma } from "@/lib/prisma";
import { ResponseAuthorType, TicketActivityType } from "@prisma/client";

/**
 * POST /api/webhooks/mailgun
 * Handle inbound email webhook from Mailgun
 */
export async function POST(request: NextRequest) {
  try {
    // Mailgun sends webhook data as form-urlencoded
    const formData = await request.formData();

    // Convert FormData to object
    const webhookData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value.toString();
    }

    // Verify webhook signature
    const signature = webhookData.signature || "";
    const token = webhookData.token || "";
    const timestamp = webhookData.timestamp || "";

    if (!signature || !token || !timestamp) {
      console.error("Missing webhook signature data");
      return NextResponse.json(
        { error: "Missing signature data" },
        { status: 400 }
      );
    }

    const isValid = verifyMailgunSignature(token, timestamp, signature);

    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse inbound email data
    const emailData = webhookData as unknown as MailgunInboundEmail;

    // Extract recipient email to find ticket
    const recipient = emailData.recipient || emailData.To || "";

    if (!recipient) {
      console.error("No recipient found in webhook");
      return NextResponse.json(
        { error: "No recipient found" },
        { status: 400 }
      );
    }

    // Extract ticket identifier from recipient email
    const ticketInfo = extractTicketIdFromEmail(recipient);

    if (!ticketInfo) {
      console.log("Email not for a ticket (recipient:", recipient, ")");
      // Not an error - might be for other purposes
      return NextResponse.json({ success: true, message: "Not a ticket email" });
    }

    // Find the ticket
    let ticket;
    if (ticketInfo.type === "id") {
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketInfo.value },
      });
    } else {
      // Search by ticket number
      ticket = await prisma.ticket.findUnique({
        where: { ticketNumber: parseInt(ticketInfo.value, 10) },
      });
    }

    if (!ticket) {
      console.error("Ticket not found:", ticketInfo);
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Parse sender information
    const fromHeader = emailData.from || emailData.Sender || emailData.sender || "";
    const senderInfo = parseSenderFromHeader(fromHeader);

    // Verify sender email matches ticket requester (security)
    // Allow case-insensitive comparison
    const senderEmailLower = senderInfo.email.toLowerCase();
    const requesterEmailLower = ticket.requesterEmail.toLowerCase();

    if (senderEmailLower !== requesterEmailLower) {
      console.warn(
        `Email sender (${senderEmailLower}) does not match ticket requester (${requesterEmailLower})`
      );
      // You might want to be stricter here or log for review
      // For now, we'll allow it but log a warning
    }

    // Extract email content
    const content = extractEmailContent(emailData);

    if (!content.text || content.text.trim().length === 0) {
      console.error("No content in email");
      return NextResponse.json(
        { error: "No content in email" },
        { status: 400 }
      );
    }

    // Check if this is an auto-reply or out-of-office message
    const subject = emailData.subject || "";
    const lowerSubject = subject.toLowerCase();
    const lowerBody = content.text.toLowerCase();

    // Common auto-reply indicators
    const autoReplyIndicators = [
      "automatic reply",
      "auto-reply",
      "out of office",
      "out of the office",
      "ooo",
      "vacation",
      "away from office",
    ];

    const isAutoReply =
      autoReplyIndicators.some((indicator) =>
        lowerSubject.includes(indicator) || lowerBody.includes(indicator)
      ) ||
      emailData["X-Auto-Response-Suppress"] === "All" ||
      emailData["Auto-Submitted"] === "auto-replied";

    if (isAutoReply) {
      console.log("Skipping auto-reply email");
      return NextResponse.json({
        success: true,
        message: "Auto-reply skipped",
      });
    }

    // Create ticket response from email
    const ticketResponse = await addResponse({
      ticketId: ticket.id,
      content: content.text,
      isInternal: false,
      sendEmail: false, // Don't send email for email replies
      authorEmail: senderInfo.email,
      authorName: senderInfo.name || senderInfo.email.split("@")[0],
      authorType: ResponseAuthorType.EMAIL,
    });

    // Create activity log
    await prisma.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        activityType: TicketActivityType.RESPONDED,
        description: "Customer replied via email",
        performedByName: senderInfo.name || senderInfo.email,
      },
    });

    // Update ticket status if it was waiting on customer
    if (ticket.status === "WAITING_ON_CUSTOMER") {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "OPEN" },
      });
    }

    console.log(`Created ticket response from email for ticket #${ticket.ticketNumber}`);

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      responseId: ticketResponse.id,
    });
  } catch (error: any) {
    console.error("Error processing Mailgun webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

