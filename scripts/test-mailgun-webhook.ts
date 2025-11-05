/**
 * Test Mailgun Webhook Locally
 * 
 * This script simulates a Mailgun webhook request for testing email replies.
 * 
 * Usage:
 *   tsx scripts/test-mailgun-webhook.ts <ticketId> <senderEmail> <message>
 * 
 * Example:
 *   tsx scripts/test-mailgun-webhook.ts ticket_abc123 customer@example.com "This is a test reply"
 */

import { config } from "dotenv";

// Load environment variables
config();

const TICKET_ID = process.argv[2];
const SENDER_EMAIL = process.argv[3] || "customer@example.com";
const MESSAGE = process.argv[4] || "This is a test reply from the customer";

if (!TICKET_ID) {
  console.error("Usage: tsx scripts/test-mailgun-webhook.ts <ticketId> [senderEmail] [message]");
  process.exit(1);
}

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/webhooks/mailgun";
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "yourdomain.com";

async function testWebhook() {
  console.log("🧪 Testing Mailgun Webhook...\n");

  // Create form data simulating Mailgun webhook
  const formData = new URLSearchParams();
  
  // Required fields for signature verification
  // Note: These will fail signature verification, but you can test the endpoint
  const timestamp = Math.floor(Date.now() / 1000).toString();
  formData.append("signature", "test-signature");
  formData.append("token", "test-token");
  formData.append("timestamp", timestamp);
  
  // Email data
  formData.append("recipient", `ticket-${TICKET_ID}@${MAILGUN_DOMAIN}`);
  formData.append("sender", SENDER_EMAIL);
  formData.append("from", `Customer <${SENDER_EMAIL}>`);
  formData.append("subject", `Re: Test Ticket`);
  formData.append("body-plain", MESSAGE);
  formData.append("stripped-text", MESSAGE);
  formData.append("body-html", `<p>${MESSAGE}</p>`);
  formData.append("stripped-html", `<p>${MESSAGE}</p>`);
  
  // Message headers (as JSON string - Mailgun format)
  const headers = [
    ["From", `Customer <${SENDER_EMAIL}>`],
    ["To", `ticket-${TICKET_ID}@${MAILGUN_DOMAIN}`],
    ["Subject", "Re: Test Ticket"],
    ["Message-Id", "<test-message-id@mailgun.com>"],
  ];
  formData.append("message-headers", JSON.stringify(headers));

  try {
    console.log("📤 Sending webhook request...");
    console.log(`   URL: ${WEBHOOK_URL}`);
    console.log(`   Ticket ID: ${TICKET_ID}`);
    console.log(`   Sender: ${SENDER_EMAIL}`);
    console.log(`   Message: ${MESSAGE}\n`);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`📥 Response Status: ${response.status}`);
    console.log(`📥 Response Body:`, responseData);

    if (response.ok) {
      console.log("\n✅ Webhook processed successfully!");
      if (responseData.success) {
        console.log(`   Ticket ID: ${responseData.ticketId}`);
        console.log(`   Ticket Number: ${responseData.ticketNumber}`);
        console.log(`   Response ID: ${responseData.responseId}`);
      }
    } else {
      console.log("\n❌ Webhook failed!");
      console.log(`   Error: ${responseData.error || responseText}`);
      
      if (response.status === 401) {
        console.log("\n⚠️  Signature verification failed (expected for manual testing)");
        console.log("   You may need to temporarily disable signature verification");
        console.log("   or use Mailgun's actual webhook for testing.");
      }
    }

    return response.ok;
  } catch (error) {
    console.error("\n❌ Error sending webhook:", error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    return false;
  }
}

testWebhook()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

