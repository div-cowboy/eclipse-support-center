/**
 * Mailgun Webhook Utilities
 * Handles verification and parsing of Mailgun inbound email webhooks
 */

import crypto from "crypto";

/**
 * Verify Mailgun webhook signature
 * Mailgun signs webhooks with a signature using your API key
 */
export function verifyMailgunSignature(
  token: string,
  timestamp: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_SIGNING_KEY || process.env.MAILGUN_API_KEY;

  if (!signingKey) {
    console.error("MAILGUN_SIGNING_KEY or MAILGUN_API_KEY not set");
    return false;
  }

  // Verify timestamp is recent (within 15 minutes)
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);

  if (isNaN(timestampNum)) {
    return false;
  }

  // Allow 15 minutes tolerance
  if (Math.abs(now - timestampNum) > 15 * 60) {
    console.error("Webhook timestamp too old or too far in future");
    return false;
  }

  // Verify signature
  const encodedToken = encodeURIComponent(token);
  const encodedTimestamp = encodeURIComponent(timestamp);
  const signingString = `${timestamp}${encodedToken}`;
  const computedSignature = crypto
    .createHmac("sha256", signingKey)
    .update(signingString)
    .digest("hex");

  return computedSignature === signature;
}

/**
 * Parse Mailgun inbound email webhook data
 */
export interface MailgunInboundEmail {
  recipient: string; // The email address that received the message
  sender: string; // The email address of the sender
  from: string; // Full "From" header
  subject: string;
  "body-plain": string; // Plain text body
  "body-html"?: string; // HTML body (if available)
  "stripped-text"?: string; // Text without quoted replies
  "stripped-html"?: string; // HTML without quoted replies
  "message-headers"?: string; // JSON string of headers
  "Message-Id"?: string;
  "In-Reply-To"?: string;
  "References"?: string;
  "attachment-count"?: string;
  [key: string]: string | undefined; // Allow other Mailgun fields
}

/**
 * Extract ticket identifier from email address
 * Supports formats:
 * - ticket-{ticketId}@domain.com
 * - ticket-{ticketNumber}@domain.com
 */
export function extractTicketIdFromEmail(email: string): {
  type: "id" | "number";
  value: string;
} | null {
  // Match patterns like ticket-abc123@domain.com or ticket-12345@domain.com
  const match = email.match(/^ticket-([^@]+)@/i);

  if (!match) {
    return null;
  }

  const identifier = match[1];

  // Check if it's a number (ticketNumber) or alphanumeric (ticketId)
  if (/^\d+$/.test(identifier)) {
    return { type: "number", value: identifier };
  } else {
    return { type: "id", value: identifier };
  }
}

/**
 * Extract email content, preferring stripped versions
 */
export function extractEmailContent(email: MailgunInboundEmail): {
  text: string;
  html?: string;
} {
  // Prefer stripped versions (without quoted replies)
  const text = email["stripped-text"] || email["body-plain"] || "";
  const html = email["stripped-html"] || email["body-html"];

  return { text: text.trim(), html: html?.trim() };
}

/**
 * Parse email headers from Mailgun webhook
 */
export function parseEmailHeaders(
  headersJson: string | undefined
): Record<string, string> {
  if (!headersJson) {
    return {};
  }

  try {
    const headers = JSON.parse(headersJson);
    const result: Record<string, string> = {};

    // Headers come as array of [key, value] pairs
    if (Array.isArray(headers)) {
      for (const [key, value] of headers) {
        result[key] = value;
      }
    } else {
      // Sometimes headers come as object
      return headers;
    }

    return result;
  } catch (error) {
    console.error("Error parsing email headers:", error);
    return {};
  }
}

/**
 * Extract sender name and email from "From" header
 */
export function parseSenderFromHeader(fromHeader: string): {
  name?: string;
  email: string;
} {
  // Match formats:
  // "Name <email@domain.com>"
  // "email@domain.com"
  const match = fromHeader.match(/^(?:"?([^"]+)"?\s*)?<(.+?)>|(.+)$/);

  if (match) {
    const name = match[1]?.trim();
    const email = match[2] || match[3] || fromHeader;

    return {
      name: name && name !== email ? name : undefined,
      email: email.trim(),
    };
  }

  return { email: fromHeader.trim() };
}


