# Chat ID Fix for Real-Time Escalation

## Problem

When testing real-time escalation, the console showed:

```
chatId: undefined
enabled: false
realtimeMode: true
channelName: "chat:undefined"
```

This meant the real-time subscription couldn't activate because there was no chatId to subscribe to.

## Root Cause

The `/api/chatbots/[id]/chat` endpoint was **not persisting chats to the database**. It only processed messages in-memory and returned responses without creating `Chat` records. This is different from:

- Traditional chats: Always have a Chat record
- Embed chats: Create Chat records for persistence

Without a Chat record, there's no `chatId` to use for real-time communication.

## Solution

### 1. Updated Chatbot Chat API to Persist Chats

**File**: `app/api/chatbots/[id]/chat/route.ts`

#### Regular (Non-Streaming) Responses

```typescript
// Get or create Chat record
let chat;
if (chatId) {
  // Find existing chat
  chat = await prisma.chat.findUnique({ where: { id: chatId } });
} else {
  // Create new chat
  chat = await prisma.chat.create({
    data: {
      title: `Chat with ${chatbot.name}`,
      chatbotId: id,
    },
  });
  console.log(`✅ Created new chat: ${chat.id}`);
}

// ... generate AI response ...

// Save BOTH messages to database
await prisma.message.create({
  data: {
    content: message,
    role: "USER",
    chatId: chat.id,
    userId: user.id,
  },
});

await prisma.message.create({
  data: {
    content: response.message.content,
    role: "AGENT", // AI agent
    chatId: chat.id,
    userId: null,
    metadata: { sources, escalationRequested, escalationReason },
  },
});

// Return chatId to frontend
return NextResponse.json({
  // ... existing fields ...
  chatId: chat.id, // NEW: Return chatId
});
```

#### Streaming Responses

```typescript
async function handleStreamingResponse(
  message,
  chatbotId,
  conversationHistory,
  config,
  chatId,
  userId // NEW: Accept chatId and userId
) {
  // Save user message before streaming starts
  await prisma.message.create({
    data: {
      content: message,
      role: "USER",
      chatId: chatId,
      userId: userId,
    },
  });

  // Send chatId in first chunk
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chatId })}\n\n`));

  // Include chatId in every chunk
  const data = {
    content: chunk.content,
    chatId: chatId, // NEW
    // ... other fields
  };

  // After stream completes, save assistant message
  if (chunk.isComplete) {
    await prisma.message.create({
      data: {
        content: fullResponse,
        role: "AGENT",
        chatId: chatId,
        userId: null,
        metadata: { sources, escalationData },
      },
    });
  }
}
```

### 2. Enhanced Frontend to Capture Chat ID

**File**: `components/chat/UniversalChatInterface.tsx`

#### From Streaming Responses

```typescript
// Capture chatId from first chunk
if (parsed.chatId && config.onChatCreated) {
  if (!assistantMessage && !config.chatId) {
    config.onChatCreated(parsed.chatId);
    console.log("📝 Chat ID captured from streaming:", parsed.chatId);
  }
}
```

#### From Regular Responses

```typescript
// Capture chatId from response
if (data.chatId && config.onChatCreated) {
  config.onChatCreated(data.chatId);
  console.log("📝 Chat ID captured from response:", data.chatId);
}
```

#### Send Chat ID in Subsequent Messages

```typescript
// Always include chatId in requests
if (config.type === "chatbot" || config.type === "embed") {
  requestBody.stream = useStreaming;
  requestBody.chatId = config.chatId; // Send chatId if available
  console.log("📤 Sending message with chatId:", config.chatId);
}
```

### 3. ChatbotChatInterface Integration

**File**: `components/chat/ChatbotChatInterface.tsx`

```typescript
const [chatId, setChatId] = useState<string | null>(null);

const chatConfig: ChatConfig = {
  // ... other config ...
  chatId: chatId || undefined,
  onChatCreated: (newChatId: string) => {
    setChatId(newChatId);
    console.log("Chat created:", newChatId);
  },
};
```

When `setChatId` is called, the component re-renders with the new chatId, making it available for real-time subscriptions.

## How It Works Now

### First Message (Chat Creation)

1. User sends first message
2. API creates new Chat record
3. API saves user message with chatId
4. API generates AI response
5. API saves AI response with chatId
6. API returns response **with chatId**
7. Frontend captures chatId via `onChatCreated` callback
8. Frontend stores chatId in state

### Subsequent Messages

1. User sends message
2. Frontend includes chatId in request
3. API finds existing Chat record
4. API saves messages with chatId
5. Process continues...

### Escalation

1. User triggers escalation
2. API already has chatId from previous messages
3. `/api/escalations` updates `chat.escalationRequested = true`
4. Frontend activates real-time mode
5. `useRealtimeChat` subscribes to `chat:{chatId}` ✅
6. Agent assigns → broadcasts to `chat:{chatId}` ✅
7. Customer receives "You're now connected to [Agent]" ✅

## Expected Console Output

### On First Message:

```
✅ Created new chat: cm3abc123
📝 Chat ID captured from streaming: cm3abc123
```

### On Subsequent Messages:

```
📤 Sending message with chatId: cm3abc123
✅ Saved messages to chat: cm3abc123
```

### On Escalation:

```
✅ Escalation logged successfully
✅ Real-time mode activated - waiting for agent to join
📡 Real-time subscription details: {
  chatId: "cm3abc123",
  realtimeMode: true,
  enabled: true,
  channelName: "chat:cm3abc123"
}
[useRealtimeChat] Subscribing to chat:cm3abc123
```

### On Agent Assignment:

```
📢 Broadcasted agent_joined event for chat:cm3abc123
🎉 AGENT JOINED EVENT RECEIVED: {agentId, agentName, timestamp}
✅ Agent joined message added to chat
```

## Benefits

1. **Chat Persistence**: All chatbot conversations are now saved to database
2. **Real-Time Ready**: Chat ID available for real-time subscriptions
3. **Consistency**: Chatbot chats work like embed and traditional chats
4. **Message History**: Full conversation history preserved in database
5. **Escalation Support**: Seamless AI-to-human transition now works

## Breaking Changes

None! The API is backward compatible:

- If chatId is provided, uses existing chat
- If no chatId, creates new chat
- Returns chatId in response for frontend to capture

## Testing

1. Start a new chatbot chat
2. Send first message
3. Check console for: "✅ Created new chat: [ID]"
4. Send second message
5. Check console for: "📤 Sending message with chatId: [ID]"
6. Trigger escalation
7. Check console for: "channelName: 'chat:[ID]'" (not undefined!)
8. Agent assigns
9. Customer should see: "✅ You're now connected to [Agent Name]"

## Database Schema

No changes needed! Uses existing:

- `Chat` model with chatbotId foreign key
- `Message` model with chatId foreign key
- `Message.role` enum includes AGENT for AI responses
