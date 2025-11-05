# Mailgun Email Reply Integration

This document explains how to set up email reply functionality using Mailgun, allowing customers to reply to support ticket emails and have those replies automatically added to tickets.

## Overview

When a support rep sends an email response to a customer, the email includes a special reply-to address (e.g., `ticket-{ticketId}@yourdomain.com`). When the customer replies, Mailgun receives the email and sends it to our webhook endpoint, which:

1. Verifies the webhook signature for security
2. Extracts the ticket identifier from the reply-to address
3. Parses the email content
4. Creates a ticket response with `authorType: EMAIL`
5. Updates the ticket status if it was waiting on the customer

## Setup Instructions

### 1. Configure Mailgun Domain

1. **Set up MX records** for your domain to point to Mailgun's servers
   - Mailgun will provide you with the MX records to add to your DNS
   - Example: `mxa.mailgun.org` and `mxb.mailgun.org`

2. **Verify your domain** in the Mailgun dashboard

### 2. Set Up Inbound Route in Mailgun

1. Go to your Mailgun dashboard → **Receiving** → **Routes**

2. Create a new route with the following settings:
   - **Filter expression**: `match_recipient("^ticket-.*@yourdomain.com")`
     - Replace `yourdomain.com` with your actual domain
     - This matches all emails sent to addresses starting with `ticket-`
   
   - **Action**: **Forward to webhook**
   - **Webhook URL**: `https://yourdomain.com/api/webhooks/mailgun`
     - Replace with your actual domain
     - For local development, use a tool like ngrok: `https://your-ngrok-url.ngrok.io/api/webhooks/mailgun`
   
   - **Priority**: Set to a high priority (lower number = higher priority)

3. **Save the route**

### 3. Environment Variables

Add these to your `.env` file:

```env
# Mailgun API Key (already set for sending emails)
MAILGUN_API_KEY=your-api-key

# Mailgun Domain (already set)
MAILGUN_DOMAIN=yourdomain.com

# Optional: Signing key for webhook verification
# If not set, will use MAILGUN_API_KEY
MAILGUN_SIGNING_KEY=your-signing-key

# Optional: Custom from address
MAILGUN_FROM=Eclipse Support <support@yourdomain.com>

# Optional: EU domain (set to true if using EU Mailgun)
MAILGUN_EU_DOMAIN=false

# Your app URL (for ticket links in emails)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. Test the Integration

1. **Send a test email** from your app:
   - Create a ticket response with "Send customer email update" checked
   - The email will include a reply-to address like `ticket-{ticketId}@yourdomain.com`

2. **Reply to the email** from the customer's email address

3. **Check the ticket** - the reply should appear as a new response with `authorType: EMAIL`

## How It Works

### Email Sending

When a support rep sends an email response:
- The email includes a reply-to address: `ticket-{ticketId}@yourdomain.com`
- This allows Mailgun to identify which ticket the reply belongs to

### Webhook Processing

When Mailgun receives an email reply:

1. **Webhook Verification**
   - Verifies the Mailgun signature to ensure the request is legitimate
   - Checks timestamp to prevent replay attacks

2. **Ticket Identification**
   - Extracts ticket ID from the recipient email address
   - Finds the corresponding ticket in the database

3. **Security Check**
   - Verifies the sender email matches the ticket requester email
   - Logs a warning if they don't match (but still processes the email)

4. **Auto-Reply Detection**
   - Detects out-of-office and auto-reply messages
   - Skips processing these to avoid spam

5. **Response Creation**
   - Extracts email content (prefers stripped text without quoted replies)
   - Creates a ticket response with `authorType: EMAIL`
   - Updates ticket status if it was waiting on customer

## Security Features

- **Webhook Signature Verification**: All webhooks are verified using Mailgun's signing key
- **Timestamp Validation**: Prevents replay attacks by checking timestamp is recent
- **Sender Verification**: Verifies sender email matches ticket requester
- **Auto-Reply Filtering**: Prevents auto-replies from creating responses

## Email Format

The reply-to address format is:
```
ticket-{ticketId}@yourdomain.com
```

Where `{ticketId}` is the unique ticket ID from your database.

## Troubleshooting

### Webhook Not Receiving Emails

1. **Check Mailgun Routes**
   - Verify the route is active
   - Check the filter expression matches your email format
   - Ensure the webhook URL is correct and accessible

2. **Check DNS Settings**
   - Verify MX records are correctly configured
   - Use `dig` or `nslookup` to verify: `dig yourdomain.com MX`

3. **Check Webhook Logs**
   - Mailgun dashboard → Receiving → Webhooks
   - Check for failed deliveries
   - Review error messages

### Replies Not Creating Ticket Responses

1. **Check Application Logs**
   - Look for errors in the webhook handler
   - Check database connection

2. **Verify Ticket Exists**
   - Ensure the ticket ID in the reply-to address matches an existing ticket

3. **Check Sender Email**
   - Verify sender email matches ticket requester
   - Check logs for warnings about mismatched emails

### Testing Locally

For local development, use **ngrok** or similar tunneling service:

1. Install ngrok: `npm install -g ngrok` or download from ngrok.com

2. Start your Next.js app: `npm run dev`

3. Start ngrok: `ngrok http 3000`

4. Use the ngrok URL in your Mailgun route:
   ```
   https://your-ngrok-url.ngrok.io/api/webhooks/mailgun
   ```

5. Update the route in Mailgun dashboard

## API Endpoint

**POST** `/api/webhooks/mailgun`

This endpoint:
- Accepts form-urlencoded data from Mailgun
- Verifies webhook signature
- Processes inbound emails
- Creates ticket responses

**Response:**
```json
{
  "success": true,
  "ticketId": "ticket_abc123",
  "ticketNumber": 1001,
  "responseId": "response_xyz789"
}
```

## Database Schema

Email replies are stored as `TicketResponse` records with:
- `authorType: EMAIL`
- `authorEmail`: The customer's email address
- `authorName`: Extracted from email headers
- `content`: Email body (prefers stripped text)

## Next Steps

1. Set up your Mailgun domain and MX records
2. Configure the inbound route in Mailgun dashboard
3. Test with a real email reply
4. Monitor webhook logs for any issues

For more information, see:
- [Mailgun Receiving Documentation](https://documentation.mailgun.com/en/latest/user_manual.html#receiving)
- [Mailgun Routes Documentation](https://documentation.mailgun.com/en/latest/user_manual.html#receiving-routes)


