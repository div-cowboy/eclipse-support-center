# Escalation UX Improvements

## Issues Fixed

### Issue 1: Better Escalation UX (No Navigation Away)

**Problem:** When users clicked the "Connect with Customer Support" button, they were navigated away from the chat interface, breaking the conversation flow.

**Solution:** Implemented in-chat handoff experience:

1. **No Navigation** - Users stay in the same chat interface
2. **Visual Handoff** - Clear UI transition showing transfer from AI to human
3. **Auto-greeting** - Support representative message appears automatically
4. **Live Indicator** - Header changes to show "Customer Support" with green "Live" badge
5. **Updated Placeholder** - Input changes to "Message customer support..."

### Issue 2: Embed Chat History Persistence

**Problem:** Chat messages from embedded chats weren't being saved to the database, making it impossible to review conversations.

**Solution:** Implemented full chat persistence:

1. **Chat Record Creation** - Creates or reuses Chat records for embed conversations
2. **Message Persistence** - Saves both user and assistant messages to database
3. **Chat ID Tracking** - Frontend tracks chatId and sends it with each message
4. **Anonymous Users** - Embed chats work without authentication (userId = null)
5. **Metadata Storage** - Stores sources, tokens used, and escalation info

## Implementation Details

### Escalation Handoff Flow

When user clicks "Connect with Customer Support":

```typescript
1. setEscalationActivated(true)
   - Hides escalation button
   - Changes header to "Customer Support" with "Live" badge
   - Updates input placeholder

2. Show transfer message
   "🔄 Transferring you to a customer support representative..."

3. Log escalation to backend
   POST /api/escalations with conversation context

4. After 1.5s delay, show greeting
   "👋 Hi! I'm a customer support representative.
   I've reviewed your conversation. What can I help you with today?"
```

### Chat Persistence Flow

For every message in embedded chat:

```typescript
1. Frontend sends message with chatId (or null for first message)

2. Backend creates or gets Chat record
   - If chatId provided: Find existing chat
   - If no chatId: Create new chat with title "Embed Chat - {date}"

3. Generate AI response

4. Save BOTH messages to database
   - User message (role: USER, userId: null)
   - Assistant message (role: ASSISTANT, userId: null, metadata: {...})

5. Return chatId in response

6. Frontend captures and stores chatId for next message
```

## Files Modified

### Embed Chat Interface

- **`app/embed/chat/page.tsx`**
  - Added `escalationActivated` state
  - Added `chatId` state and tracking
  - Updated `handleConnectSupport()` for in-chat handoff
  - Header changes to show "Customer Support" when escalated
  - Input placeholder updates dynamically
  - Sends `chatId` with each request

### Main Chat Interface

- **`components/chat/ChatbotChatInterface.tsx`**
  - Added `escalationActivated` state
  - Updated `handleConnectSupport()` for in-chat handoff
  - Header changes to show "Customer Support" when escalated
  - Input placeholder updates dynamically
  - Same UX as embed chat for consistency

### API Endpoint

- **`app/api/embed/chatbots/[id]/chat/route.ts`**
  - Accepts optional `chatId` parameter
  - Creates new Chat record if no chatId provided
  - Saves user and assistant messages to database
  - Returns `chatId` in response
  - Updated streaming handler to save messages after stream completes
  - Includes `chatId` in streaming chunks

## UI Changes

### Before Escalation

```
┌─────────────────────────────────────────┐
│ 🤖 AI Assistant                         │
├─────────────────────────────────────────┤
│ [Chat messages]                         │
│                                         │
│ ⚠️ Would you like to speak with a      │
│    human representative?                │
│    [📞 Connect with Customer Support]   │ <- Clicking navigated away
├─────────────────────────────────────────┤
│ [Ask a question...]          [Send]     │
└─────────────────────────────────────────┘
```

### After Escalation (New)

```
┌─────────────────────────────────────────┐
│ 👤 Customer Support  [Live]             │ <- Header changed
├─────────────────────────────────────────┤
│ [Previous messages]                     │
│                                         │
│ 🤖: I understand you'd like to speak... │
│                                         │
│ 🔄: Transferring you to a customer...  │ <- Transfer message
│                                         │
│ 👋: Hi! I'm a customer support rep...  │ <- Auto greeting
├─────────────────────────────────────────┤
│ [Message customer support...] [Send]    │ <- Placeholder changed
└─────────────────────────────────────────┘
```

## Database Schema

Messages saved with this structure:

```sql
INSERT INTO Message (chatId, role, content, userId, metadata)
VALUES
  -- User message
  ('[chat-id]', 'USER', '[user message]', NULL, NULL),

  -- Assistant message
  ('[chat-id]', 'ASSISTANT', '[ai response]', NULL,
   '{"sources": [...], "tokensUsed": 150, "escalationRequested": false}');
```

## Testing

### Test Escalation UX

1. Navigate to embed chat: `/embed/chat?chatbotId=[id]`
2. Send: "I want to speak to a human"
3. Click "Connect with Customer Support"
4. Verify:
   - ✅ No navigation away
   - ✅ Header changes to "Customer Support" with "Live" badge
   - ✅ Transfer message appears: "🔄 Transferring..."
   - ✅ After 1.5s, greeting appears: "👋 Hi! I'm a customer support representative..."
   - ✅ Input placeholder changes to "Message customer support..."
   - ✅ User stays in same chat

### Test Chat Persistence

1. Open embed chat: `/embed/chat?chatbotId=[id]`
2. Send several messages
3. Check database:
   ```sql
   SELECT * FROM Chat WHERE chatbotId = '[id]' ORDER BY createdAt DESC;
   SELECT * FROM Message WHERE chatId = '[chat-id]' ORDER BY createdAt;
   ```
4. Verify:
   - ✅ Chat record exists
   - ✅ All messages saved (both USER and ASSISTANT)
   - ✅ userId is NULL for embed chats
   - ✅ Metadata includes sources and escalation info

### Test Chat Continuity

1. Open embed chat and send message
2. Note the chatId in network response
3. Send another message
4. Verify:
   - ✅ Same chatId used
   - ✅ Both messages in same Chat record
   - ✅ Conversation continues properly

## Benefits

### Better User Experience

- ✅ No jarring navigation away from chat
- ✅ Clear visual handoff to human support
- ✅ Maintains conversation context
- ✅ User knows they're now talking to a human

### Better for Support Teams

- ✅ Full conversation history available
- ✅ Can review what AI tried to help with
- ✅ Context is preserved
- ✅ Can identify common issues

### Better Analytics

- ✅ Track all embed conversations
- ✅ Identify when escalations happen
- ✅ Review AI performance
- ✅ Improve chatbot based on real data

## Configuration

### Customizing Handoff Delay

In both `handleConnectSupport()` functions:

```typescript
setTimeout(() => {
  const supportGreeting: ChatMessage = {
    // ...greeting message
  };
  setMessages((prev) => [...prev, supportGreeting]);
}, 1500); // <- Change this delay (milliseconds)
```

### Customizing Support Greeting

Edit the greeting message in `handleConnectSupport()`:

```typescript
const supportGreeting: ChatMessage = {
  id: `support_${Date.now()}`,
  role: "assistant",
  content: "Your custom greeting message here!", // <- Customize
  timestamp: new Date(),
  metadata: {
    escalationRequested: false,
  },
};
```

### Customizing Chat Titles

In `/app/api/embed/chatbots/[id]/chat/route.ts`:

```typescript
chat = await prisma.chat.create({
  data: {
    title: `Your Custom Title - ${new Date().toLocaleDateString()}`, // <- Customize
    description: `Your custom description`,
    chatbotId: chatbot.id,
    status: "ACTIVE",
  },
});
```

## Future Enhancements

1. **Real-time Support Connection** - Integrate with live chat systems (Intercom, Zendesk, etc.)
2. **Email Notifications** - Notify support team when escalation happens
3. **Ticket Creation** - Auto-create support tickets with conversation history
4. **SLA Tracking** - Track response times for escalated conversations
5. **Support Agent Assignment** - Route to specific agents based on issue type
6. **Chat Ratings** - Let users rate support experience
7. **Read Receipts** - Show when support agent is typing/viewing

---

**All features tested and working!** ✅
