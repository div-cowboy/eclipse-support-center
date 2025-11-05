/**
 * Mailgun Service
 * Handles email sending via Mailgun API
 */

import FormData from "form-data";
import Mailgun from "mailgun.js";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  "h:Reply-To"?: string; // Mailgun specific header
}

/**
 * Initialize Mailgun client
 */
function getMailgunClient() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey) {
    throw new Error("MAILGUN_API_KEY environment variable is not set");
  }

  if (!domain) {
    throw new Error("MAILGUN_DOMAIN environment variable is not set");
  }

  const mailgun = new Mailgun(FormData);

  // Check if using EU domain (set MAILGUN_EU_DOMAIN=true in .env)
  const isEuDomain = process.env.MAILGUN_EU_DOMAIN === "true";

  const mg = mailgun.client({
    username: "api",
    key: apiKey,
    ...(isEuDomain && { url: "https://api.eu.mailgun.net" }),
  });

  return { mg, domain };
}

/**
 * Send a simple email via Mailgun
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ id?: string; message?: string; [key: string]: unknown }> {
  try {
    const { mg, domain } = getMailgunClient();

    const fromAddress =
      options.from ||
      process.env.MAILGUN_FROM ||
      `Eclipse Support <postmaster@${domain}>`;

    const messageData: Record<string, string | string[] | undefined> = {
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html || options.text, // Use HTML if provided, otherwise use text
    };

    // Add reply-to if provided
    if (options.replyTo || options["h:Reply-To"]) {
      messageData["h:Reply-To"] =
        options["h:Reply-To"] || options.replyTo || undefined;
    }

    // Remove undefined values before sending
    const cleanMessageData = Object.fromEntries(
      Object.entries(messageData).filter(([, value]) => value !== undefined)
    );

    // Type assertion needed because Mailgun types may not match exactly
    const data = await mg.messages.create(
      domain,
      cleanMessageData as Parameters<typeof mg.messages.create>[1]
    );

    return data;
  } catch (error) {
    console.error("Error sending email via Mailgun:", error);
    throw error;
  }
}

/**
 * Send a ticket response email to the customer
 */
export async function sendTicketResponseEmail(
  ticketNumber: number,
  ticketSubject: string,
  requesterName: string,
  requesterEmail: string,
  responseContent: string,
  authorName: string,
  ticketUrl?: string,
  ticketId?: string
): Promise<{ id?: string; message?: string; [key: string]: unknown }> {
  const subject = `Re: [Ticket #${ticketNumber}] ${ticketSubject}`;

  const text = `
Hello ${requesterName},

${authorName} has responded to your support ticket:

${responseContent}

${ticketUrl ? `View your ticket: ${ticketUrl}` : ""}

---
Ticket #${ticketNumber}
${ticketSubject}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .response { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Ticket Response - #${ticketNumber}</h2>
      <p><strong>Subject:</strong> ${ticketSubject}</p>
    </div>
    
    <div class="content">
      <p>Hello ${requesterName},</p>
      
      <p><strong>${authorName}</strong> has responded to your support ticket:</p>
      
      <div class="response">
        ${responseContent.replace(/\n/g, "<br>")}
      </div>
      
      ${
        ticketUrl
          ? `<p><a href="${ticketUrl}" class="button">View Ticket</a></p>`
          : ""
      }
    </div>
    
    <div class="footer">
      <p>This is an automated email from Eclipse Support Center.</p>
      <p>Ticket #${ticketNumber} - ${ticketSubject}</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Generate reply-to address with ticket identifier
  // Format: ticket-{ticketNumber}@yourdomain.com or ticket-{ticketId}@yourdomain.com
  // Note: This uses the same domain as MAILGUN_DOMAIN to ensure replies are received
  const domain = process.env.MAILGUN_DOMAIN;
  if (!domain) {
    throw new Error("MAILGUN_DOMAIN is required for reply-to addresses");
  }

  // Note: Sandbox domains (sandbox*.mailgun.org) cannot receive emails
  // You must use a verified domain with MX records configured for email replies to work
  const replyToAddress = ticketId
    ? `ticket-${ticketId}@${domain}`
    : `ticket-${ticketNumber}@${domain}`;

  return sendEmail({
    to: `${requesterName} <${requesterEmail}>`,
    subject,
    text,
    html,
    "h:Reply-To": replyToAddress, // Use Mailgun header for reply-to
  });
}
