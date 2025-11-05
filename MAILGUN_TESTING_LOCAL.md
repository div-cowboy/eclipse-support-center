# Testing Mailgun Email Replies Locally

This guide shows you how to test email reply functionality in your local development environment.

## Quick Start

You'll need **ngrok** (or similar) to expose your local webhook endpoint to Mailgun.

## Method 1: Using ngrok (Recommended)

### Step 1: Install ngrok

```bash
# macOS (using Homebrew)
brew install ngrok

# Or download from: https://ngrok.com/download
```

### Step 2: Start Your Next.js App

```bash
npm run dev
```

Your app should be running on `http://localhost:3000`

### Step 3: Start ngrok

In a **new terminal**, run:

```bash
ngrok http 3000
```

You'll see output like:

```
ngrok                                                                               

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`) - this is your public URL.

### Step 4: Configure Mailgun Route

1. Go to your **Mailgun Dashboard** → **Receiving** → **Routes**

2. Create a new route or edit existing:
   - **Filter expression**: `match_recipient("^ticket-.*@yourdomain.com")`
   - **Action**: **Forward to webhook**
   - **Webhook URL**: `https://abc123.ngrok.io/api/webhooks/mailgun`
     - Replace `abc123.ngrok.io` with your actual ngrok URL
   - **Priority**: `1` (high priority)

3. **Save the route**

### Step 5: Test the Webhook

First, test that your webhook endpoint is accessible:

```bash
# Test the endpoint (should return an error, but that's OK - it means it's reachable)
curl https://abc123.ngrok.io/api/webhooks/mailgun
```

You should see a response (even if it's an error - that means ngrok is forwarding correctly).

### Step 6: Send a Test Email

1. **Create a ticket** in your app (or use an existing one)

2. **Add a response** to the ticket with "Send customer email update" checked

3. **Check your email** - you should receive an email with a reply-to address like:
   ```
   ticket-{ticketId}@yourdomain.com
   ```

### Step 7: Reply to the Email

1. **Reply to the email** from the customer's email address (the ticket requester)

2. **Watch your Next.js terminal** - you should see logs like:
   ```
   Created ticket response from email for ticket #1001
   ```

3. **Check the ticket** in your app - the reply should appear as a new response with `authorType: EMAIL`

### Step 8: Monitor ngrok Traffic

Open `http://127.0.0.1:4040` in your browser to see:
- All requests to your webhook
- Request/response details
- Debug webhook payloads

## Method 2: Using Mailgun's Testing Feature

Mailgun provides a testing feature where you can manually trigger webhooks.

### Step 1: Set Up Route (Same as Method 1)

Configure the route in Mailgun dashboard pointing to your ngrok URL.

### Step 2: Use Mailgun's Webhook Testing

1. Go to **Mailgun Dashboard** → **Receiving** → **Webhooks**

2. Click **"Test Webhook"** or **"Send Test"**

3. Use Mailgun's webhook simulator to send test data

However, this method is limited because:
- You need to manually construct the webhook payload
- Mailgun's test may not include all the fields we need
- It's better to test with real emails

## Method 3: Mock Webhook (For Quick Testing)

You can manually send a webhook request to test:

```bash
# Create a test webhook payload
curl -X POST https://abc123.ngrok.io/api/webhooks/mailgun \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "signature=test-sig" \
  -d "token=test-token" \
  -d "timestamp=$(date +%s)" \
  -d "recipient=ticket-YOUR_TICKET_ID@yourdomain.com" \
  -d "sender=customer@example.com" \
  -d "from=Customer Name <customer@example.com>" \
  -d "subject=Re: Test Ticket" \
  -d "body-plain=This is a test reply" \
  -d "stripped-text=This is a test reply"
```

**Note**: This will fail signature verification, but you can temporarily disable it for testing.

## Troubleshooting

### Webhook Not Receiving Requests

1. **Check ngrok is running**
   ```bash
   # Check ngrok status
   curl http://127.0.0.1:4040/api/tunnels
   ```

2. **Verify Next.js is running**
   ```bash
   curl http://localhost:3000/api/webhooks/mailgun
   ```

3. **Check Mailgun route is active**
   - Go to Mailgun dashboard → Routes
   - Ensure route is enabled
   - Check webhook URL matches your ngrok URL

### Signature Verification Failing

The webhook verifies Mailgun signatures. If you're testing manually, you may need to:

1. **Temporarily disable signature check** (for testing only):
   ```typescript
   // In app/api/webhooks/mailgun/route.ts
   // Comment out or modify the verification:
   // const isValid = verifyMailgunSignature(token, timestamp, signature);
   // if (!isValid) { ... }
   ```

2. **Or use Mailgun's actual webhook** (recommended)

### Email Reply Not Creating Response

1. **Check application logs**:
   ```bash
   # Watch Next.js logs
   npm run dev
   ```

2. **Check ngrok inspector**:
   - Open `http://127.0.0.1:4040`
   - See the actual webhook payload
   - Check for errors

3. **Verify ticket exists**:
   - Ensure the ticket ID in the reply-to address exists
   - Check database for the ticket

4. **Check sender email**:
   - Sender email must match ticket requester email
   - Check logs for warnings about mismatched emails

### ngrok URL Changes

If you restart ngrok, you'll get a new URL. **Update your Mailgun route** with the new URL.

**Pro Tip**: Use ngrok's paid plan for a static domain, or use a service like `localtunnel` or `serveo` for persistent URLs.

## Testing Checklist

- [ ] ngrok installed and running
- [ ] Next.js app running on port 3000
- [ ] ngrok forwarding to `http://localhost:3000`
- [ ] Mailgun route configured with ngrok URL
- [ ] Test email sent from app
- [ ] Reply sent from customer email
- [ ] Webhook request received (check ngrok inspector)
- [ ] Ticket response created in database
- [ ] Response appears in ticket UI

## Environment Variables for Local Testing

Make sure your `.env.local` has:

```env
# Mailgun Configuration
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=yourdomain.com  # Or use sandbox domain for testing
MAILGUN_SIGNING_KEY=your-signing-key  # Optional, uses API_KEY if not set

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For local testing
# Or use ngrok URL: NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

## Alternative Tools

If you don't want to use ngrok:

1. **localtunnel**: `npx localtunnel --port 3000`
2. **serveo**: `ssh -R 80:localhost:3000 serveo.net`
3. **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:3000`

## Next Steps

Once testing locally works:
1. Test with real email replies
2. Monitor webhook logs
3. Test edge cases (auto-replies, attachments, etc.)
4. Deploy to staging/production

