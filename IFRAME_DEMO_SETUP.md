# Iframe Demo Setup Guide

This guide will help you get the homepage iframe demo working.

## What Was Added

An example iframe has been added to the homepage (`app/page.tsx`) that demonstrates how to embed the Eclipse Support Center chat widget on any website.

## Prerequisites

Before the iframe will work, you need to:

### 1. Set Up Your Database

Make sure you have a `.env` file with your database connection string. If you don't have one:

```bash
cp .env.example .env
```

Then update the `DATABASE_URL` in `.env` with your Supabase or PostgreSQL connection string.

### 2. Run Database Migrations

If you haven't already, push the schema to your database:

```bash
npm run db:push
```

### 3. Seed the Demo Data

Run the seed script to create a demo chatbot:

```bash
npm run db:seed
```

This will create:

- A demo organization named "Eclipse Support Center"
- A demo chatbot with ID `"demo"`
- Sample context blocks with information about the platform

## What the Seed Creates

The seed script creates:

```
✅ Demo Organization: Eclipse Support Center
✅ Demo Chatbot: Eclipse Demo Assistant (ID: "demo")
✅ 3 Context Blocks:
   - About Eclipse Support Center
   - Getting Started Guide
   - FAQ - How does it work?
```

## Using the Iframe

Once seeded, the homepage iframe will work automatically using the chatbot ID `"demo"`.

### Customization Options

You can customize the iframe by modifying the URL parameters:

```html
<iframe
  src="/embed/chat?chatbotId=YOUR_CHATBOT_ID&theme=light&primaryColor=%233b82f6"
  width="400"
  height="600"
></iframe>
```

Available parameters:

- `chatbotId` - Your chatbot's unique ID (required)
- `theme` - `light`, `dark`, or `auto`
- `welcomeMessage` - Custom greeting (URL encoded)
- `placeholder` - Input placeholder text (URL encoded)
- `primaryColor` - Brand color in hex (URL encoded, e.g., `%233b82f6`)
- `showBranding` - Show/hide organization badge (`true` or `false`)

## Testing with Your Own Chatbot

To use your own chatbot in the iframe:

1. Create a chatbot in the app at `/app/chatbots/new`
2. Copy the chatbot ID
3. Update the iframe URL in `app/page.tsx`:
   ```tsx
   src = "/embed/chat?chatbotId=YOUR_CHATBOT_ID";
   ```

## Embedding on External Sites

To embed the chat widget on an external website, use the full URL:

```html
<iframe
  src="https://your-domain.com/embed/chat?chatbotId=YOUR_CHATBOT_ID"
  width="400"
  height="600"
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
></iframe>
```

For more advanced embedding options, see [EMBEDDING_GUIDE.md](./EMBEDDING_GUIDE.md).

## Troubleshooting

### "Loading chat..." shows indefinitely

This means the chatbot ID doesn't exist or isn't active. Check:

1. The database is properly connected
2. You've run the seed script (`npm run db:seed`)
3. The chatbot ID in the iframe URL is correct
4. The chatbot status is set to `ACTIVE`

### Database connection errors

Make sure your `.env` file has a valid `DATABASE_URL`:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

For Supabase, use the connection pooler URL for better performance.

### "Cannot find module" errors

Run `npm install` to ensure all dependencies are installed.

## Next Steps

- View the live demo at http://localhost:3000
- Read the full embedding guide at [EMBEDDING_GUIDE.md](./EMBEDDING_GUIDE.md)
- Create your own chatbots at `/app/chatbots/new`
- Add context blocks to improve chatbot responses
