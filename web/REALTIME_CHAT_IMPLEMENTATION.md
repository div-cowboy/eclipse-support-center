# Real-Time Chat Implementation

## Overview

This document describes the seamless AI-to-human chat escalation system that enables customers to transition from AI chatbot conversations to live support agent conversations in real-time.

## Architecture

The system uses a custom EventEmitter-based real-time communication layer that mimics Supabase's real-time functionality. When a customer escalates from AI chat, the conversation continues in the same interface using real-time message broadcasting.

## How It Works

### Customer Journey

1. **AI Chat Phase**

   - Customer interacts with AI chatbot
   - AI detects escalation request (e.g., "I need to speak to a human")
   - AI provides empathetic final message acknowledging the request

2. **Escalation Activation**

   - Customer clicks "Connect with Customer Support" button
   - System calls `/api/escalations` to log and mark chat as escalated
   - Chat switches to **real-time mode**
   - Customer sees: "⏱️ Connecting you to a support agent. Please wait..."
   - Customer can continue sending messages (stored in DB, agent will see them)

3. **Agent Joins**

   - When agent assigns themselves to the chat, customer receives:
   - System message: "✅ Support Agent [Name] has joined the chat"
   - Real-time bidirectional chat begins immediately

4. **Live Chat**
   - Customer and agent exchange messages in real-time
   - All messages broadcast instantly via EventEmitter
   - All messages persisted to database
   - Full conversation history (AI + human) visible to both parties

### Agent Journey

1. **View Escalations**

   - Navigate to `/app/chats` page
   - See escalated chats highlighted with:
     - 🚨 Amber background for urgent (unassigned escalations)
     - "Needs Response" filter shows unassigned escalations
     - Time since escalation displayed

2. **Pick Up Chat**

   - Agent clicks on escalated chat
   - Opens `/app/chats/[id]` with `isSupportView={true}`
   - Chat automatically detects `escalationRequested: true`
   - Enables **real-time mode** automatically

3. **Assign to Self**

   - Agent uses existing "Assign to Me" functionality
   - `POST /api/chats/[id]/assign` is called
   - System broadcasts `agent_joined` event to customer
   - Customer sees notification that agent has joined

4. **Live Chat**
   - Agent sees full AI conversation history
   - Agent types and sends messages in real-time
   - Messages broadcast instantly to customer
   - All messages saved to database

## Key Components

### 1. Real-Time Message Broadcasting API

**Endpoint**: `POST /api/chats/[id]/messages/send`

**Purpose**: Saves message to database and broadcasts to all subscribers

**Request Body**:

```json
{
  "content": "Message text",
  "role": "USER" | "ASSISTANT"
}
```

**Response**:

```json
{
  "success": true,
  "message": {
    "id": "msg_123",
    "content": "Message text",
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00Z",
    "sender": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": null
    }
  }
}
```

**Features**:

- Validates chat is escalated
- Saves message to database
- Broadcasts via EventEmitter to channel `chat:{chatId}:message`
- Returns message with sender info

### 2. useRealtimeChat Hook

**Location**: `components/hooks/useRealtimeChat.ts`

**Purpose**: React hook for subscribing to chat channels and sending real-time messages

**Usage**:

```typescript
const { sendMessage, isConnected, error } = useRealtimeChat({
  chatId: "chat_123",
  enabled: true,
  onMessage: (message) => {
    // Handle incoming message
    console.log("Received:", message);
  },
  onAgentJoined: (agent) => {
    // Handle agent joined event
    console.log("Agent joined:", agent.agentName);
  },
  onTyping: (userId, isTyping) => {
    // Handle typing indicator
  },
  onError: (error) => {
    // Handle errors
  },
});

// Send a message
await sendMessage("Hello!", "USER");
```

**Features**:

- Auto-subscribes to chat channel when enabled
- Listens for messages, agent_joined, and typing events
- Provides sendMessage function that calls API and broadcasts
- Handles cleanup on unmount

### 3. UniversalChatInterface with Real-Time Mode

**Location**: `components/chat/UniversalChatInterface.tsx`

**New Config Option**: `features.realtimeMode: boolean`

**How It Works**:

- When `realtimeMode` is enabled, uses `useRealtimeChat` hook
- Routes messages to real-time API instead of AI endpoints
- Receives incoming messages via EventEmitter
- Shows system messages for agent joined events
- Maintains full message history (AI + human)

**Message Routing**:

```typescript
if (realtimeMode && config.chatId) {
  // Route to real-time system
  await sendRealtimeMessage(message, role);
} else {
  // Route to AI system
  await sendToAI(message);
}
```

### 4. TraditionalChatInterface Enhancement

**Location**: `components/chat/TraditionalChatInterface.tsx`

**Enhancement**: Automatically detects escalated chats and enables real-time mode

**Logic**:

```typescript
// Load chat info
const chatInfo = await fetch(`/api/chats/${chatId}`).then((r) => r.json());

// Enable real-time mode if escalated
const realtimeMode = chatInfo?.escalationRequested || false;

// Pass to UniversalChatInterface
<UniversalChatInterface
  config={{
    ...config,
    features: {
      ...features,
      realtimeMode,
    },
  }}
/>;
```

### 5. Agent Assignment with Broadcasting

**Location**: `app/api/chats/[id]/assign/route.ts`

**Enhancement**: Broadcasts agent_joined event after successful assignment

**Code Added**:

```typescript
// After updating database
const agentJoinedPayload = {
  type: "broadcast",
  event: "agent_joined",
  payload: {
    agentId: user.id,
    agentName: user.name || user.email || "Support Agent",
    timestamp: new Date(),
  },
};

globalEventEmitter.emit(`chat:${chatId}:agent_joined`, agentJoinedPayload);
```

### 6. Enhanced Chats List

**Location**: `app/app/chats/page.tsx`

**Enhancements**:

- Filter tabs: "All Chats", "Needs Response", "Assigned Chats"
- Urgent escalations highlighted with amber background
- Shows 🚨 badge for unassigned escalations
- Displays time since escalation requested
- Sorts unassigned escalations to top

**Visual Indicators**:

- **Amber background** + **border-left**: Unassigned escalation (urgent)
- **Green badge**: Escalated and assigned
- **Time badge**: "2h ago", "5m ago", etc.

## Event Flow Diagrams

### Customer Escalation Flow

```
Customer: "I need a human"
    ↓
AI: "Let me connect you..." (FINAL AI MESSAGE)
    ↓
Customer clicks "Connect with Customer Support"
    ↓
POST /api/escalations
    ↓
Chat.escalationRequested = true (DB)
    ↓
UniversalChatInterface.realtimeMode = true
    ↓
useRealtimeChat hook activates
    ↓
Subscribe to chat:{chatId} channel
    ↓
Show: "⏱️ Connecting you to support..."
    ↓
Customer can send messages (stored in DB)
    ↓
(Wait for agent to assign...)
    ↓
Receive agent_joined event
    ↓
Show: "✅ Agent Sarah joined"
    ↓
Real-time chat active 🎉
```

### Agent Assignment Flow

```
Agent views /app/chats
    ↓
Sees escalated chat (🚨 highlighted)
    ↓
Clicks chat → /app/chats/{chatId}
    ↓
TraditionalChatInterface loads
    ↓
Detects escalationRequested = true
    ↓
Enables realtimeMode automatically
    ↓
useRealtimeChat hook activates
    ↓
Subscribe to chat:{chatId} channel
    ↓
Agent sees full AI conversation + customer messages
    ↓
Agent clicks "Assign to Me"
    ↓
POST /api/chats/{chatId}/assign
    ↓
Update DB: assignedToId, assignedAt
    ↓
Broadcast agent_joined event
    ↓
Customer receives notification
    ↓
Real-time chat active 🎉
```

### Real-Time Message Flow

```
User (customer or agent) types message
    ↓
Calls sendRealtimeMessage("Hello", "USER")
    ↓
POST /api/chats/{chatId}/messages/send
    ↓
Validate chat is escalated
    ↓
Save to Message table in DB
    ↓
Prepare broadcast payload with sender info
    ↓
globalEventEmitter.emit(`chat:{chatId}:message`, payload)
    ↓
All subscribers receive message instantly
    ↓
useRealtimeChat.onMessage() called
    ↓
Add message to local state
    ↓
React re-renders both UIs
    ↓
Message appears instantly for both parties
```

## Channel Naming Convention

- **Message broadcasting**: `chat:{chatId}:message`
- **Agent joined**: `chat:{chatId}:agent_joined`
- **Typing indicators**: `chat:{chatId}:typing`

## Database Schema

No schema changes were needed! Existing schema already supports:

- `Chat.escalationRequested` - Marks chat as escalated
- `Chat.escalationReason` - Why escalation was requested
- `Chat.escalationRequestedAt` - Timestamp
- `Chat.assignedToId` - Assigned agent
- `Chat.assignedAt` - When assigned
- `Message.role` - USER, ASSISTANT, AGENT, SYSTEM
- `Message.userId` - Who sent the message

## Configuration

### Enable Real-Time Mode

```typescript
const chatConfig: ChatConfig = {
  // ... other config
  features: {
    realtimeMode: true, // Enable real-time chat
    escalation: false, // Disable escalation button (already escalated)
    supportView: true, // If this is agent view
    // ... other features
  },
};
```

### Customer Chat (with escalation)

```tsx
<UniversalChatInterface
  config={{
    type: "chatbot",
    chatbotId: "bot_123",
    chatId: "chat_123",
    features: {
      escalation: true, // Show escalation button
      realtimeMode: false, // Will be enabled after escalation
    },
  }}
/>
```

### Agent Chat (picking up escalated chat)

```tsx
<TraditionalChatInterface
  chatId="chat_123"
  isSupportView={true}
  // Automatically enables realtimeMode if chat is escalated
/>
```

## Testing

### Test Scenario 1: Customer Escalation

1. Open chatbot chat interface
2. Send: "I need to speak to a human"
3. AI responds with empathetic message
4. Blue "Connect with Customer Support" button appears
5. Click button
6. See: "⏱️ Connecting you to support..."
7. Send a message: "Hello, waiting for agent"
8. Message is saved (agent will see it)

### Test Scenario 2: Agent Picks Up Chat

1. Open `/app/chats` as agent
2. See escalated chat with 🚨 badge
3. Click "Needs Response" filter to see only urgent chats
4. Click on escalated chat
5. See full AI conversation + customer messages
6. Click "Assign to Me"
7. Real-time mode activates
8. Send message: "Hi! I'm here to help"
9. Message appears instantly on customer side

### Test Scenario 3: Real-Time Communication

1. Have both customer and agent chats open side-by-side
2. Customer types and sends message
3. Should appear instantly on agent side
4. Agent types and sends message
5. Should appear instantly on customer side
6. Check database - both messages saved
7. Refresh page - messages persist

## Future Enhancements

### Phase 1 (Current) ✅

- [x] Real-time message broadcasting
- [x] Agent assignment notifications
- [x] Seamless AI-to-human transition
- [x] Escalation queue with filtering

### Phase 2 (Future)

- [ ] Typing indicators ("Agent is typing...")
- [ ] Online/offline status
- [ ] Read receipts
- [ ] File/image sharing
- [ ] Chat transfer between agents
- [ ] Canned responses for agents
- [ ] Agent notes (internal, not visible to customer)

### Phase 3 (Advanced)

- [ ] Multiple agents observing same chat (training/supervision)
- [ ] Chat analytics dashboard
- [ ] Average response time tracking
- [ ] Customer satisfaction ratings
- [ ] Smart routing based on agent skills
- [ ] Queue management with SLA alerts

## Troubleshooting

### Messages not appearing in real-time

**Symptom**: Messages save to DB but don't appear instantly

**Solution**:

1. Check that `realtimeMode` is enabled
2. Verify `useRealtimeChat` hook is active (check console logs)
3. Ensure chat is escalated (`escalationRequested: true`)
4. Check browser console for EventEmitter errors

### Agent joined notification not showing

**Symptom**: Agent assigns but customer doesn't see notification

**Solution**:

1. Check `/api/chats/[id]/assign` response
2. Verify EventEmitter broadcast is called (check server logs)
3. Ensure customer's `useRealtimeChat` hook is subscribed
4. Check for `agent_joined` event in browser console

### Real-time mode not activating

**Symptom**: Chat still using AI after escalation

**Solution**:

1. Verify `Chat.escalationRequested` is `true` in database
2. Check `TraditionalChatInterface` loads chat info correctly
3. Ensure `config.features.realtimeMode` is set based on escalation
4. Refresh page to reload chat state

## Security Considerations

### Authentication

- Real-time messages API requires session for ASSISTANT role
- Customer messages (USER role) can be sent without auth (for embedded chats)
- Consider adding rate limiting for anonymous users

### Authorization

- Agent assignment checks organization membership
- Real-time API verifies chat is escalated before allowing messages
- Agents can only assign chats from their organizations

### Data Privacy

- All messages stored in database with audit trail
- User IDs tracked for accountability
- Consider adding message encryption for sensitive chats

## Performance

### EventEmitter Scalability

- Current implementation uses in-memory EventEmitter
- Works well for single-server deployments
- For multi-server setups, consider:
  - Redis pub/sub
  - WebSocket server (Socket.io)
  - Actual Supabase Realtime

### Message Broadcasting

- Messages broadcast to all subscribers on channel
- Currently no throttling or rate limiting
- Consider adding message queue for high-volume chats

## Conclusion

The real-time chat system provides a seamless transition from AI to human support, maintaining conversation continuity and delivering instant communication between customers and support agents. The implementation reuses existing chat infrastructure and requires no database changes, making it easy to deploy and maintain.

**Next Steps**:

1. Test the implementation thoroughly
2. Monitor real-time performance in production
3. Gather user feedback on the escalation UX
4. Plan Phase 2 enhancements (typing indicators, status, etc.)
