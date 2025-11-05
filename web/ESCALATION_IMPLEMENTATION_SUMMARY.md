# Escalation System - Implementation Summary

## ✅ What Was Implemented

### 1. Backend System (`lib/chatbot-service-enhanced.ts`)

**Global Rules Constant**

- Added `GLOBAL_CHATBOT_RULES` that are automatically appended to every chatbot's system prompt
- Includes escalation protocol with keyword detection
- Monitors for phrases like: "human", "agent", "frustrated", "manager", "not helping"

**Escalation Detection**

- Added `detectEscalation()` method that:
  - Detects `[ESCALATION_REQUESTED]` marker in AI responses
  - Removes marker from user-facing content
  - Returns escalation status and reason

**Response Metadata**

- Updated `ChatMessage` interface to include:
  - `escalationRequested?: boolean`
  - `escalationReason?: string`

### 2. API Routes

**Updated Routes:**

- ✅ `/api/chatbots/[id]/chat` - Regular and streaming responses include escalation metadata
- ✅ `/api/embed/chatbots/[id]/chat` - Embed endpoint also supports escalation
- ✅ `/api/escalations` - NEW endpoint to log escalation requests

### 3. Frontend Components

#### Main Chat Interface (`components/chat/ChatbotChatInterface.tsx`)

**State Management**

- Added `escalationRequested` state
- Added `escalationReason` state

**Response Handling**

- Both regular and streaming responses check for escalation
- Sets escalation state when detected

**UI Components**

- Blue banner appears when escalation is triggered
- "Connect with Customer Support" button
- Shows escalation reason to user
- Styled with appropriate icons and colors

**Support Handler**

- Opens support contact page
- Logs escalation to backend
- Includes conversation context

#### Embeddable Chat Interface (`app/embed/chat/page.tsx`)

**State Management**

- Added `escalationRequested` state
- Added `escalationReason` state
- Same functionality as main chat interface

**Response Handling**

- Streaming responses capture escalation metadata
- Updates escalation state when detected

**UI Components**

- Same blue banner design as main chat
- "Connect with Customer Support" button
- Opens support in parent window (for iframe embeds)

**Support Handler**

- Opens support URL in parent window if embedded
- Logs escalation with `isEmbedded: true` flag
- Includes full conversation context

## 🧪 How to Test

### Step 1: Start the Application

```bash
npm run dev
```

### Step 2: Navigate to a Chatbot Chat

Go to any chatbot chat interface:

**Main Chat Interface:**

- `/app/chatbots/[chatbot-id]/chat`

**Embedded Chat Interface:**

- `/embed/chat?chatbotId=[chatbot-id]`

### Step 3: Send a Test Message

Type one of these messages:

- "I want to speak to a human"
- "Can I talk to a real person?"
- "This isn't helping, I need a manager"
- "Connect me with customer support"
- "I'm frustrated"

### Step 4: Verify the Behavior

You should see:

1. **AI Response**:

   - Empathetic acknowledgment
   - No visible `[ESCALATION_REQUESTED]` marker
   - Message like: "I understand you'd like to speak with a human representative..."

2. **Blue Banner Appears**:

   - Shows above the input field
   - Contains "Would you like to speak with a human representative?"
   - Shows the escalation reason
   - Displays "Connect with Customer Support" button

3. **Click the Button**:

   - Opens support contact page (currently `/support/contact?chatbotId=...`)
   - Check browser console for: `🚨 ESCALATION REQUESTED: {...}`
   - Backend logs the escalation

4. **Debug Mode** (optional):
   - Click "Show Debug" in the chat interface
   - See `escalationRequested: true` in the raw response data

## 🎨 UI Preview

When escalation is triggered, you'll see:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Would you like to speak with a human           │
│      representative?                                │
│                                                     │
│      User requested human assistance               │
│                                                     │
│      [📞 Connect with Customer Support]            │
└─────────────────────────────────────────────────────┘
```

## 🔧 Customization

### Change Support URL

Edit `handleConnectSupport()` in `ChatbotChatInterface.tsx`:

```typescript
const supportUrl = `/your/custom/support/url?chatbotId=${chatbotId}`;
```

### Add More Keywords

Edit `GLOBAL_CHATBOT_RULES` in `lib/chatbot-service-enhanced.ts`:

```typescript
const GLOBAL_CHATBOT_RULES = [
  // ... existing rules
  "• Watch for escalation keywords like: 'human', 'real person', 'YOUR_NEW_KEYWORD'",
];
```

### Integrate with Live Chat

Uncomment in `handleConnectSupport()`:

```typescript
if (window.Intercom) {
  window.Intercom("show");
}
```

## 📊 Monitoring Escalations

Escalations are logged to `/api/escalations` with:

- Chatbot ID
- Reason
- Full conversation history
- Timestamp

Check your browser console and server logs for escalation events.

## 🐛 Troubleshooting

### Button Not Appearing

1. **Check Backend**: Open browser DevTools Network tab, verify API response includes `escalationRequested: true`
2. **Check Console**: Look for any JavaScript errors
3. **Verify State**: Enable debug mode to see raw response data
4. **Test Keyword**: Try exact phrase: "I want to speak to a human"

### Marker Visible in Message

If you see `[ESCALATION_REQUESTED]` in the chat:

- Check that `detectEscalation()` is being called
- Verify the marker is being removed in the backend

### Wrong Support URL

Edit the `handleConnectSupport()` function in `ChatbotChatInterface.tsx`

## 📝 Next Steps

1. **Create Support Contact Page**: Currently opens `/support/contact` which may not exist yet
2. **Email Notifications**: Extend `/api/escalations` to send emails to support team
3. **Database Storage**: Store escalations in database for reporting
4. **Analytics Dashboard**: Build admin view to see escalation metrics
5. **Response SLA**: Set up alerts when escalations aren't responded to quickly

## 🎯 Key Files Modified

1. `lib/chatbot-service-enhanced.ts` - Backend logic
2. `components/chat/ChatbotChatInterface.tsx` - Main chat UI
3. `app/embed/chat/page.tsx` - **Embeddable chat UI (FIXED)**
4. `app/api/chatbots/[id]/chat/route.ts` - Authenticated API
5. `app/api/embed/chatbots/[id]/chat/route.ts` - Embed API
6. `app/api/escalations/route.ts` - NEW logging endpoint
7. `ESCALATION_SYSTEM.md` - Complete documentation

## ✨ Features

✅ Automatic keyword detection
✅ AI responds empathetically
✅ Clean marker removal
✅ Prominent UI button
✅ Conversation context included
✅ Backend logging
✅ Works with streaming responses
✅ Works with regular responses
✅ Main chat interface fully supported
✅ Embedded chat interface fully supported
✅ Opens support in parent window for iframes
✅ No breaking changes

## 🔍 Example API Response

```json
{
  "success": true,
  "response": "I understand you'd like to speak with a human representative...",
  "escalationRequested": true,
  "escalationReason": "User requested human assistance",
  "sources": [...],
  "tokensUsed": 150
}
```

---

**Ready to test!** 🚀

Try sending "I want to speak to a human" to any chatbot and watch the escalation system in action.
