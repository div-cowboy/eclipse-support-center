# Supabase Realtime Integration

## ✅ What Was Changed

We've replaced the mock EventEmitter/BroadcastChannel system with **real Supabase Realtime** for reliable cross-tab, cross-window, and cross-origin communication.

## 🔧 Changes Made

### 1. Installed Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Replaced Mock Client with Real Supabase

**File**: `lib/supabase.ts`

**Before** (Mock):

```typescript
class MockSupabaseClient {
  // 150+ lines of mock code
  // Used EventEmitter + BroadcastChannel
  // Only worked same-origin
}
```

**After** (Real):

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

**Lines of code**: 150+ → 15 ✅

### 3. Updated useRealtimeChat Hook

**Changes**:

- Updated `subscribe()` to use callback pattern (real Supabase API)
- Handles subscription status: `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`
- Updated payload structure (real Supabase doesn't double-wrap)

### 4. Updated Agent Assignment

**File**: `app/app/chats/[id]/page.tsx`

Changed from BroadcastChannel to Supabase broadcast:

```typescript
channel.send({
  type: "broadcast",
  event: "agent_joined",
  payload: { agentId, agentName, timestamp },
});
```

## 🌐 How Supabase Realtime Works

```
┌─────────────┐                  ┌──────────────────┐                  ┌─────────────┐
│   Iframe    │  WebSocket       │  Supabase        │   WebSocket      │ Agent Tab   │
│  (Customer) │ ←──────────────→ │  Realtime Server │ ←──────────────→ │  (Support)  │
└─────────────┘                  └──────────────────┘                  └─────────────┘
                                          │
                                          ↓
                                  Manages connections
                                  Routes messages
                                  Handles reconnection
```

**Key Features**:

- ✅ Works across different origins (iframe embed on customer site)
- ✅ Works across tabs/windows
- ✅ Automatic reconnection on network failure
- ✅ Message ordering guaranteed
- ✅ No server code needed from us
- ✅ Scales automatically

## 📡 Channel Architecture

Each chat gets its own channel:

**Channel naming**: `chat:{chatId}`  
**Example**: `chat:cmhavp3xg001hm6flkp49qj6c`

**Events**:

- `message` - Chat messages
- `agent_joined` - When agent picks up chat
- `typing` - Typing indicators (future)

## 🔄 Message Flow

### Customer Sends Message

```
1. Customer types in iframe
2. Call API: POST /api/chats/{id}/messages/send
3. API saves to PostgreSQL
4. Client broadcasts via Supabase:
   channel.send({ type: "broadcast", event: "message", payload: {...} })
5. Supabase Realtime server receives
6. Supabase broadcasts to all subscribers on chat:{chatId}
7. Agent's browser receives via WebSocket
8. Agent UI updates instantly ✅
```

### Agent Assigns Chat

```
1. Agent clicks "Assign to Me"
2. Call API: POST /api/chats/{id}/assign
3. API updates database
4. Client broadcasts via Supabase:
   channel.send({ type: "broadcast", event: "agent_joined", payload: {...} })
5. Supabase Realtime server receives
6. Supabase broadcasts to all subscribers on chat:{chatId}
7. Customer's iframe receives via WebSocket
8. Shows: "✅ You're now connected to Sam" ✅
```

## 🧪 Testing

### **Using the Test Page**

1. Open `http://localhost:3000/test-embed`
2. Enter your chatbot ID
3. Send: "I need to speak to a human"
4. Click "Connect with Customer Support"
5. Open `http://localhost:3000/app/chats` in **another tab**
6. Assign the chat
7. **Check iframe console**:
   ```
   [useRealtimeChat] ✅ Successfully subscribed to channel: chat:xxx
   Realtime: connected to wss://realtime.supabase.co/...
   [useRealtimeChat] 🎉 Agent joined event received
   ✅ You're now connected to Sam
   ```

### **Using External Embed** (Real-world scenario)

1. Open `public/embed-example.html` in browser (file:// or any domain)
2. Iframe loads from `http://localhost:3000/embed/chat`
3. Different origins, but Supabase Realtime still works! ✅

## 🔍 Debugging

### Check Supabase Connection

**In browser console, you should see**:

```
✅ Supabase Realtime client initialized
📡 Project URL: https://bwaogkuwukmqfuyfgafq.supabase.co
```

**Then on subscription**:

```
[useRealtimeChat] Channel status: JOINING
[useRealtimeChat] Channel status: SUBSCRIBED
[useRealtimeChat] ✅ Successfully subscribed to channel: chat:xxx
```

### Check WebSocket Connection

**In Network tab** (Chrome DevTools):

- Filter: `WS` (WebSocket)
- Should see: Connection to `wss://realtime.supabase.co/...`
- Status: `101 Switching Protocols`
- Messages tab shows broadcasts

### Common Issues

**Issue**: "Channel status: CHANNEL_ERROR"

**Solution**:

- Check Supabase credentials are correct
- Check Realtime is enabled in Supabase dashboard
- Check network/firewall isn't blocking WebSocket

**Issue**: Messages not received

**Solution**:

- Check both sides subscribe to same channel name
- Check payload structure matches
- Check WebSocket connection is open (Network tab)

## 🎯 Expected Behavior

### Iframe (Customer)

```
[Loads iframe]
✅ Supabase Realtime client initialized
[Sends message]
📝 Chat ID captured: cmhavp...
[Escalates]
[useRealtimeChat] ✅ Subscribing to chat:cmhavp...
Realtime: connected to wss://realtime.supabase.co
[useRealtimeChat] Channel status: SUBSCRIBED
⏱️ Connecting you to a support agent. Please wait...
[Agent assigns]
[useRealtimeChat] 🎉 Agent joined event received
✅ You're now connected to Sam
[Agent sends message]
[useRealtimeChat] Received message: "Hello, how can I help?"
```

### Agent Tab

```
[Opens /app/chats/{id}]
✅ Supabase Realtime client initialized
[useRealtimeChat] ✅ Subscribing to chat:cmhavp...
Realtime: connected to wss://realtime.supabase.co
[useRealtimeChat] Channel status: SUBSCRIBED
[Clicks "Assign to Me"]
📢 Broadcasted agent_joined via Supabase Realtime
[Sends message]
[useRealtimeChat] 📢 Broadcasted message via Supabase Realtime
[Customer replies]
[useRealtimeChat] Received message: "Thanks for the help!"
```

## 📝 Configuration

### Environment Variables Required

Already configured in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://bwaogkuwukmqfuyfgafq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Supabase Dashboard Settings

1. Go to: https://supabase.com/dashboard
2. Select your project: `bwaogkuwukmqfuyfgafq`
3. Settings → API
4. Confirm: ✅ Realtime is enabled (enabled by default)

## 🚀 Production Deployment

No code changes needed! Just ensure environment variables are set:

- Vercel: Add to project settings
- Other platforms: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Supabase automatically handles:

- WebSocket scaling
- Connection pooling
- Load balancing
- Geographic distribution
- SSL/TLS encryption

## 💰 Pricing

**Supabase Free Tier** (what you're on):

- 2GB database
- 1GB file storage
- **200 concurrent Realtime connections** ← Plenty for most apps!
- 2 million Realtime messages/month

**Pro Tier** ($25/month):

- 8GB database
- **500 concurrent connections**
- 5 million messages/month
- Priority support

For a support chat app, you'll likely stay in free tier for a long time!

## 🎉 Next Steps

1. **Test the integration** using `/test-embed`
2. **Monitor WebSocket connections** in browser DevTools
3. **Check Supabase Dashboard** → Realtime Inspector to see live broadcasts
4. **Deploy to production** with same code - just works!

## 🔗 Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Broadcast Channel API](https://supabase.com/docs/guides/realtime/broadcast)
- [Debugging Realtime](https://supabase.com/docs/guides/realtime/debugging)

---

The integration is complete! Real Supabase Realtime should now work across all your chat interfaces, including iframes on different domains. 🚀
