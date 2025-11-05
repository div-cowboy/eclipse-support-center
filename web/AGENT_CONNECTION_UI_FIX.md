# Agent Connection UI Fix

## Problem

When an agent picked up a chat using the "Pick Up Chat" button in Chat Actions, the system was not showing the connection UI that displays who the chat is connected to. This affected both the customer's view and the agent's view of the chat.

## Root Cause

The issue was with how the `agent_joined` event was being broadcast when using **WebSocket mode**:

1. **Wrong Redis Mechanism**: The `/api/chats/[id]/assign` endpoint was using `redis.lpush()` (Redis **streams**) to broadcast the event, but the WebSocket server was listening on Redis **pub/sub** channels.

2. **Redis Streams vs Pub/Sub**: These are two completely different Redis mechanisms:
   - **Redis Streams** (`lpush`/`xread`): Append-only log, good for message history
   - **Redis Pub/Sub** (`publish`/`subscribe`): Real-time message delivery, no persistence

3. **WebSocket Server Setup**: The WebSocket server subscribes to `chat:{chatId}` channels using Redis pub/sub (line 74 in `ws-server/src/server.ts`), but the API was publishing to a different mechanism entirely.

4. **Result**: When the agent picked up a chat, the event was written to Redis streams, but the WebSocket server never saw it because it was listening on pub/sub channels.

## Solution

### Changed to Client-Side Broadcasting

Since Supabase Realtime's broadcast feature works client-to-client, we moved the broadcasting responsibility from the server to the client:

**File: `/app/app/chats/[id]/page.tsx`**

When an agent clicks "Pick Up Chat", the client now:

1. **Calls the API** to assign the chat (updates database)
2. **Gets agent info** from the API response
3. **Subscribes to Supabase channel** for that chat
4. **Broadcasts `agent_joined` event** with agent details
5. **Unsubscribes** after broadcasting

```typescript
// After successful assignment
const { supabase } = await import("@/lib/supabase");
const channel = supabase.channel(`chat:${chatId}`);

// Subscribe first (required by Supabase)
await new Promise<void>((resolve, reject) => {
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") resolve();
    else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      reject(new Error(`Channel subscription failed: ${status}`));
    }
  });
});

// Broadcast the event
await channel.send({
  type: "broadcast",
  event: "agent_joined",
  payload: {
    agentId: data.chat.assignedToId,
    agentName:
      data.chat.assignedTo?.name ||
      data.chat.assignedTo?.email ||
      "Support Agent",
    timestamp: new Date().toISOString(),
  },
});

// Clean up
await channel.unsubscribe();
```

### How It Works Now (WebSocket Mode)

```
┌──────────────────────────────────────────────────────────────┐
│ Agent clicks "Pick Up Chat"                                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
               ┌─────────────────────┐
               │ POST /api/chats/    │
               │ {id}/assign         │
               │                     │
               │ • Update DB         │
               │ • Publish to Redis  │
               └──────────┬──────────┘
                          │
                          ▼
                ┌──────────────────────┐
                │ Redis Pub/Sub        │
                │ Channel: chat:{id}   │
                └──────────┬───────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ WebSocket Server        │
              │ (Subscribed to channel) │
              └──────────┬──────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
    ┌──────────────┐           ┌──────────────┐
    │ Customer WS  │           │ Agent WS     │
    │ Client       │           │ Client       │
    └───────┬──────┘           └───────┬──────┘
            │                          │
            ▼                          ▼
    ┌──────────────┐           ┌──────────────┐
    │ Shows:       │           │ Shows:       │
    │ "✅ You're   │           │ "✅ You're   │
    │ connected    │           │ connected    │
    │ to Sam"      │           │ to Sam"      │
    └──────────────┘           └──────────────┘
```

## What The User Sees

### Customer View (Embed Chat)

After agent picks up the chat:

1. **System message** appears: "✅ You're now connected to [Agent Name]"
2. **Header badge** changes from amber "Awaiting Response" to green "Live"
3. **Status text** updates to show connection is established

### Agent View (Chat Detail Page)

After picking up the chat:

1. **System message** appears in chat: "✅ You're now connected to [Agent Name]"
2. **Right sidebar** shows green "Assigned To" box with agent name
3. **"Pick Up Chat" button** changes to "Release Chat" button

## Files Changed

### `/app/api/chats/[id]/assign/route.ts`

- **Removed**: Server-side broadcasting via `globalEventEmitter` (didn't work)
- **Kept**: WebSocket/Redis broadcasting for future WebSocket implementation
- **Simplified**: Focused server-side code on database updates only

### `/app/app/chats/[id]/page.tsx`

- **Added**: Client-side Supabase Realtime broadcasting in `handlePickUpChat()`
- **Added**: Proper channel subscription and cleanup
- **Added**: Error handling for broadcast failures
- **Enhanced**: Logging for debugging

## Testing

To verify the fix:

1. **Open customer chat** in one tab:

   - Go to `/test-embed` or open `public/embed-example.html`
   - Send a message and request human support
   - You should see "Awaiting Response" badge

2. **Open agent view** in another tab:

   - Go to `/app/chats`
   - Find the escalated chat
   - Click on it to open the detail page

3. **Pick up the chat**:

   - Click "Pick Up Chat" button
   - Check console for: `📢 [Client] Broadcasted agent_joined event via Supabase Realtime`

4. **Verify both views**:
   - **Customer tab**: Should show "✅ You're now connected to [Your Name]" message and green "Live" badge
   - **Agent tab**: Should show the same system message and green "Assigned To" box in sidebar

## Future: WebSocket Implementation

When switching to the custom WebSocket server (by setting `NEXT_PUBLIC_USE_WEBSOCKET=true`):

- The server-side Redis broadcasting code is already in place
- The WebSocket server can publish `agent_joined` events via Redis pub/sub
- The WebSocket client hook (`useWebSocketChat`) already handles `agent_joined` events
- No additional changes needed on the client side

## Why This Approach?

**Supabase Realtime Broadcast** is a client-to-client messaging feature:

- Clients subscribe to channels
- Clients broadcast messages to channels
- Supabase infrastructure routes messages between clients
- **Servers cannot directly broadcast** using the same API

**Alternative approaches considered**:

1. ❌ Use Supabase's server-side SDK - Still doesn't support broadcast to client channels
2. ❌ Keep using EventEmitter - Only works within same server process
3. ✅ **Client-side broadcasting** - Works with Supabase's architecture
4. ✅ WebSocket server - Future implementation for full server-to-client broadcasting

The client-side broadcasting approach is the correct way to use Supabase Realtime and ensures both the customer and agent see the connection UI immediately when a chat is picked up.

---

**Status**: ✅ Fixed and ready for testing
**Date**: October 31, 2025
