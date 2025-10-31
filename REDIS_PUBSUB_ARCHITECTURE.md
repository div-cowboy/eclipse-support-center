# Redis Pub/Sub Architecture

## Overview

The Eclipse Support Center uses **Redis Pub/Sub** for real-time communication between the Next.js API, WebSocket server, and browser clients.

## Why Redis Pub/Sub?

✅ **Real-time**: Sub-millisecond message delivery  
✅ **Simple**: Fire-and-forget, no message queues to manage  
✅ **Scalable**: Multiple WebSocket servers can subscribe to the same channels  
✅ **Ephemeral**: Perfect for real-time notifications (agent joined, messages, etc.)

❌ **NOT Redis Streams**: We don't use `lpush`/`xread` - those are for message history/queues

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT SENDS MESSAGE                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Customer Browser     │
              │ WebSocket Client     │
              └──────────┬───────────┘
                         │ ws.send()
                         ▼
              ┌──────────────────────┐
              │ WebSocket Server     │
              │ (ws-server/)         │
              └──────────┬───────────┘
                         │ fetch()
                         ▼
              ┌──────────────────────┐
              │ Next.js API          │
              │ /api/chats/messages  │
              │                      │
              │ 1. Save to DB        │
              │ 2. redis.publish()   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Redis Server         │
              │ Channel: chat:{id}   │
              │                      │
              │ PUBLISH command      │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ WebSocket Server(s)  │
              │ (Subscribed)         │
              │                      │
              │ Receives message     │
              └──────────┬───────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
    ┌─────────────┐             ┌─────────────┐
    │ Customer    │             │ Agent       │
    │ Browser     │             │ Browser     │
    │             │             │             │
    │ Shows msg   │             │ Shows msg   │
    └─────────────┘             └─────────────┘
```

## Implementation

### 1. Publishing (Next.js API)

**When**: Agent picks up chat, messages are sent, etc.

**Where**:

- `/app/api/chats/[id]/assign/route.ts` (agent_joined events)
- `/app/api/chats/[id]/messages/send/route.ts` (chat messages)

**Code**:

```typescript
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

await redis.publish(`chat:${chatId}`, JSON.stringify({
  type: "message" | "agent_joined",
  data: { ... },
  timestamp: new Date().toISOString(),
}));
```

### 2. Subscribing (WebSocket Server)

**When**: Client connects to a chat room

**Where**: `ws-server/src/server.ts`

**Code**:

```typescript
// Subscribe to Redis channel when first client connects
subscribeToRedisChannel(`chat:${chatId}`, (message) => {
  // Broadcast to all WebSocket clients in this chat room
  broadcastToRoom(chatId, message);
});
```

### 3. Receiving (Browser Clients)

**Where**: `components/hooks/useWebSocketChat.ts`

**Code**:

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "message":
      onMessage(message.data);
      break;
    case "agent_joined":
      onAgentJoined(message.data);
      break;
  }
};
```

## Message Types

### 1. Chat Messages

**Type**: `message`

**Payload**:

```json
{
  "type": "message",
  "data": {
    "id": "msg_123",
    "content": "Hello!",
    "role": "user",
    "timestamp": "2025-10-31T12:00:00Z",
    "sender": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": null
    }
  },
  "timestamp": "2025-10-31T12:00:00Z"
}
```

### 2. Agent Joined

**Type**: `agent_joined`

**Payload**:

```json
{
  "type": "agent_joined",
  "data": {
    "agentId": "user_456",
    "agentName": "Sam Davidoff",
    "timestamp": "2025-10-31T12:00:00Z"
  },
  "timestamp": "2025-10-31T12:00:00Z"
}
```

### 3. Typing Indicators

**Type**: `typing`

**Payload**:

```json
{
  "type": "typing",
  "data": {
    "userId": "user_123",
    "isTyping": true
  },
  "timestamp": "2025-10-31T12:00:00Z"
}
```

## Channel Naming Convention

**Pattern**: `chat:{chatId}`

**Examples**:

- `chat:cmhavp3xg001hm6flkp49qj6c`
- `chat:cmhbxk8yz002jn7fl3p8qkx9d`

**Why**:

- Clear namespace separation
- Easy to debug (can see chat ID in logs)
- Follows Redis best practices

## Environment Variables

### Next.js API

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### WebSocket Server

```bash
# ws-server/.env
REDIS_URL=redis://your-redis-url:6379
```

**Note**: Next.js uses REST API (Upstash), WebSocket server uses native TCP connection.

## Scaling

### Multiple WebSocket Servers

Redis pub/sub automatically handles distribution:

```
┌────────────┐
│ Next.js    │
│ API        │
│ Publishes  │
└──────┬─────┘
       │
       ▼
┌─────────────┐
│ Redis       │
│ Pub/Sub     │
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌─────┐  ┌─────┐
│ WS  │  │ WS  │
│ #1  │  │ #2  │
└──┬──┘  └──┬──┘
   │        │
   ▼        ▼
 Users    Users
```

All WebSocket servers receive the message and broadcast to their connected clients.

## Performance

**Latency**: <10ms from publish to receive (typically 1-5ms)

**Throughput**: Redis can handle 100,000+ messages/second

**Connection Overhead**: Minimal - one subscription per chat room per server

## Monitoring

### Check Messages in Real-Time

Redis CLI:

```bash
redis-cli
> SUBSCRIBE chat:cmhavp3xg001hm6flkp49qj6c
```

### View Published Messages

Next.js API logs:

```
📢 [Redis Pub/Sub] Published message to chat:abc123
```

WebSocket server logs:

```
Subscribed to Redis channel: chat:abc123
Broadcasting to room: chat:abc123 (2 clients)
```

Browser console:

```
[useWebSocketChat] Received message: { type: "message", ... }
```

## Troubleshooting

### Messages Not Appearing

1. **Check Redis connection**:

   - API: `UPSTASH_REDIS_REST_URL` set?
   - WS Server: Can it connect to `REDIS_URL`?

2. **Check WebSocket connection**:

   - Browser console: WebSocket status
   - Server logs: Connection count

3. **Check channel names**:
   - Must match exactly: `chat:{chatId}`
   - Check for typos or extra spaces

### Duplicate Messages

- Check client-side duplicate prevention
- Verify message IDs are unique
- Check for multiple subscriptions

### Messages Only Work One Direction

- Verify both API and WS server publish to same channel
- Check WebSocket server is subscribed
- Verify clients are connected

## Comparison: Streams vs Pub/Sub

| Feature         | Streams (❌ Not Used) | Pub/Sub (✅ Used)       |
| --------------- | --------------------- | ----------------------- |
| **Commands**    | `XADD`, `XREAD`       | `PUBLISH`, `SUBSCRIBE`  |
| **Persistence** | Yes                   | No                      |
| **History**     | Full log              | None                    |
| **Speed**       | Slower                | Faster                  |
| **Use Case**    | Event sourcing        | Real-time notifications |
| **Our Need**    | ❌                    | ✅                      |

## Why Not Supabase Realtime?

We tried Supabase Realtime initially, but:

- ❌ Broadcast is client-to-client only (can't publish from server)
- ❌ Required complex workarounds
- ✅ Redis pub/sub is simpler and more flexible
- ✅ Works perfectly with our WebSocket server

---

**Status**: ✅ Production-ready  
**Last Updated**: October 31, 2025
