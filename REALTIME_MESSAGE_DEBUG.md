# Real-Time Message Debugging Guide

## Issue

Messages not appearing in real-time on the embed chat after escalation.

## Diagnostic Steps

### 1. Check Embed WebSocket Connection

**Open embed chat in browser** → Press F12 → Console tab

**Look for these logs:**

✅ **Good** - WebSocket is connecting:

```
[useRealtimeChat] → Using WebSocket implementation
[useWebSocketChat] Fetching WebSocket token for chat:cmh...
[useWebSocketChat] Connecting to ws://...
[useWebSocketChat] ✅ Connected to chat:cmh...
```

❌ **Bad** - WebSocket is NOT enabled:

```
[useRealtimeChat] → Using Supabase implementation
```

❌ **Bad** - Not connecting:

```
[useWebSocketChat] Not connecting { enabled: false, chatId: '...' }
```

### 2. Check Real-Time Mode

**In embed console, look for:**

```
[EmbedChat] State changed: {
  chatId: "cmh...",
  isEscalated: true,  ← Should be TRUE after escalation
  realtimeModeEnabled: true,  ← Should be TRUE
  view: "chat"
}
```

If `isEscalated: false` or `realtimeModeEnabled: false`, real-time won't work!

### 3. Send a Test Message

**Customer types message** → Check console for:

```
[UniversalChatInterface] sendMessage called: {
  realtimeMode: true,  ← Must be TRUE
  chatId: "cmh...",
  supportView: false,
  willUseRealtime: true  ← Must be TRUE
}
```

Then:

```
[UniversalChatInterface] Using REAL-TIME mode: {
  messageRole: "USER",
  chatId: "cmh..."
}
```

Then:

```
[useWebSocketChat] Sending message: { role: "USER", length: 12 }
```

### 4. Check WebSocket Server Receives

**In WebSocket server terminal**, look for:

```
Processing chat message from user anonymous in chat cmh...
Message sent successfully { chatId: 'cmh...', userId: 'anonymous', localBroadcasts: 1, messageId: '...' }
```

### 5. Check API Publishes to Redis

**In Next.js dev server terminal**, look for:

```
📢 [Redis Pub/Sub] Published message to chat:cmh... { messageId: '...', role: 'USER', channel: 'chat:cmh...' }
```

### 6. Check Customer Receives Message Back

**In embed console**, look for:

```
[useWebSocketChat] Received message: { type: "message", chatId: "cmh..." }
[UniversalChatInterface] Received real-time message: { id: "...", role: "user", sender: "Customer" }
```

## Common Issues

### Issue 1: isEscalated Not Set

**Symptom**: Real-time mode not enabled after clicking "Connect with Support"

**Fix**: Check escalation handler in `app/embed/chat/page.tsx` line 175:

```typescript
setIsEscalated(true);
```

**Test**: After clicking escalation button, check console for:

```
[EmbedChat] Escalation completed, enabling real-time mode
```

### Issue 2: WebSocket Not Connecting

**Symptom**: Logs show `enabled: false`

**Possible causes**:

- `chatId` is null/undefined
- `realtimeMode` is false
- WebSocket server not running

**Check**:

1. Is `chatId` set? Look for: `[EmbedChat] Chat created - updating chatId state: cmh...`
2. Is WebSocket server running? Check `ws-server` terminal
3. Are environment variables set?
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Issue 3: Messages Only Show for Sender

**Symptom**: Customer sees their messages (optimistic), but agent doesn't

**Cause**: WebSocket server not broadcasting to Redis, or API not publishing

**Check**:

1. WebSocket server logs: Should see "Message sent successfully"
2. API logs: Should see "📢 [Redis Pub/Sub] Published message"
3. Check Redis connection from both Next.js and WS server

### Issue 4: Messages Not Persisting

**Symptom**: Messages disappear on refresh

**Cause**: Messages only in optimistic state, not saved to database

**Check**: Database should have records in `Message` table with the chatId

## Test Procedure

1. **Open embed** in one browser tab
2. **Open `/app/chats`** in another tab
3. **In embed**: Send message "test 1" (should see optimistic message immediately)
4. **Check agent tab**: Should see "test 1" appear (confirms WebSocket → API → Redis → Agent)
5. **In agent tab**: Send message "test 2"
6. **Check embed**: Should see "test 2" appear (confirms Agent → API → Redis → WebSocket → Customer)
7. **Refresh embed**: All messages should still be there (confirms database persistence)

## Quick Fix Checklist

- [ ] WebSocket server is running (`cd ws-server && npm start`)
- [ ] Environment variables are set in both Next.js and ws-server
- [ ] Chat is escalated (check `isEscalated: true` in console)
- [ ] `chatId` exists (not null)
- [ ] Real-time mode is enabled (`realtimeMode: true`)
- [ ] WebSocket connection succeeds (see "✅ Connected" log)
- [ ] Messages go through WebSocket (see "Sending message" log)
- [ ] API publishes to Redis (see "📢 [Redis Pub/Sub]" log)
- [ ] Customer receives messages back (see "Received message" log)

---

**Last Updated**: October 31, 2025
