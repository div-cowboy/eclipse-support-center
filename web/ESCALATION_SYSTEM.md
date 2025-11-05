# Escalation System Documentation

## Overview

The escalation system allows chatbots to detect when users want to speak with a human representative and automatically trigger an escalation protocol. When triggered, the frontend receives metadata to display a "Connect with Customer Support" button.

## How It Works

### 1. Global Rules

All chatbots are configured with global rules that are automatically appended to their system prompts. These rules include:

- **Escalation Detection**: The AI monitors for keywords and phrases indicating user frustration or requests for human assistance
- **Escalation Trigger**: When detected, the AI includes a special marker `[ESCALATION_REQUESTED]` in its response
- **Empathetic Response**: The AI responds empathetically and informs the user that support has been notified

**Keywords monitored:**

- "human", "real person", "agent", "representative"
- "speak to someone", "talk to someone"
- "not helping", "frustrated", "tired of this"
- "manager", "supervisor"

### 2. Backend Processing

The system automatically:

1. Detects the `[ESCALATION_REQUESTED]` marker in AI responses
2. Removes the marker from the user-facing content
3. Adds escalation metadata to the response

**Response Metadata:**

```typescript
{
  escalationRequested: boolean;
  escalationReason?: string;
}
```

### 3. API Response

Both regular and streaming responses include escalation metadata:

**Regular Response:**

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

**Streaming Response:**

```json
{
  "content": "Full response here",
  "isComplete": true,
  "escalationRequested": true,
  "escalationReason": "User requested human assistance",
  "sources": [...]
}
```

## Implementation Status

✅ **Backend**: Fully implemented
✅ **API Routes**: Updated (authenticated and embed endpoints)
✅ **Frontend**: Fully implemented in `ChatbotChatInterface.tsx`
✅ **Escalation Logging**: API endpoint created at `/api/escalations`

## Frontend Integration

The frontend integration is already complete in `ChatbotChatInterface.tsx`. Here's how it works:

### Step 1: Check for Escalation in Response

When receiving a chatbot response, check the `escalationRequested` field:

```typescript
const response = await fetch("/api/chatbots/[id]/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userMessage,
    conversationHistory: messages,
  }),
});

const data = await response.json();

if (data.escalationRequested) {
  // Show the "Connect with Customer Support" button
  showEscalationButton(data.escalationReason);
}
```

### Step 2: Display the Escalation Button

When escalation is detected, display a prominent button for users to connect with support:

```tsx
{
  escalationRequested && (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-800 mb-2">
        Would you like to speak with a human representative?
      </p>
      <button
        onClick={handleConnectSupport}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Connect with Customer Support
      </button>
    </div>
  );
}
```

### Step 3: Handle Support Connection

When the user clicks the button, handle the escalation:

```typescript
const handleConnectSupport = () => {
  // Option 1: Open a support form
  window.open("/support/contact", "_blank");

  // Option 2: Trigger a live chat widget
  if (window.Intercom) {
    window.Intercom("show");
  }

  // Option 3: Send escalation to your backend
  fetch("/api/escalations", {
    method: "POST",
    body: JSON.stringify({
      chatId: currentChatId,
      reason: escalationReason,
      messages: conversationHistory,
    }),
  });

  // Option 4: Show contact information
  showContactModal();
};
```

## Streaming Support

For streaming responses, accumulate the escalation status and show the button after the stream completes:

```typescript
const eventSource = new EventSource("/api/chatbots/[id]/chat?stream=true");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.isComplete) {
    if (data.escalationRequested) {
      setShowEscalationButton(true);
      setEscalationReason(data.escalationReason);
    }
    eventSource.close();
  }
};
```

## Customizing Global Rules

To customize the escalation behavior, edit the `GLOBAL_CHATBOT_RULES` constant in `/lib/chatbot-service-enhanced.ts`:

```typescript
const GLOBAL_CHATBOT_RULES = [
  "• ESCALATION PROTOCOL: If a user expresses frustration...",
  "• When escalation is triggered, you MUST include...",
  // Add your custom rules here
  "• Your custom escalation rule",
];
```

## Testing

### Quick Test Guide

1. **Start a chat**: Navigate to any chatbot chat interface (e.g., `/app/chatbots/[id]/chat`)

2. **Trigger escalation** by sending one of these test messages:

   - "I want to speak to a human"
   - "Can I talk to a real person?"
   - "This isn't helping, I need your manager"
   - "Connect me with customer support"
   - "I'm frustrated and need help from a human"

3. **Expected behavior**:

   - ✅ The AI responds empathetically acknowledging your request
   - ✅ A blue banner appears above the input field with "Connect with Customer Support" button
   - ✅ The `[ESCALATION_REQUESTED]` marker is NOT visible in the message
   - ✅ Debug mode shows `escalationRequested: true` in the raw response

4. **Click the button**:
   - Opens support contact page
   - Logs escalation to `/api/escalations` endpoint
   - Check browser console for "🚨 ESCALATION REQUESTED" log

### Testing Checklist

- [ ] Backend detects escalation keywords
- [ ] `[ESCALATION_REQUESTED]` marker is removed from user-facing content
- [ ] Response includes `escalationRequested: true` metadata
- [ ] Blue escalation banner appears in the UI
- [ ] "Connect with Customer Support" button is visible
- [ ] Clicking button logs escalation to backend
- [ ] Works with both regular and streaming responses

## API Endpoints

Both authenticated and embedded chatbot endpoints support escalation:

- **Authenticated**: `POST /api/chatbots/[id]/chat`
- **Embedded**: `POST /api/embed/chatbots/[id]/chat`

## Customizing Support Contact

The escalation button in `ChatbotChatInterface.tsx` currently opens a support form. You can customize this behavior in the `handleConnectSupport` function:

```typescript
const handleConnectSupport = () => {
  // Option 1: Change the support URL
  const supportUrl = `/support/contact?chatbotId=${chatbotId}`;
  window.open(supportUrl, "_blank");

  // Option 2: Trigger a live chat widget (Intercom, Drift, etc.)
  // if (window.Intercom) {
  //   window.Intercom("show");
  // }

  // Option 3: Open email client
  // window.location.href = `mailto:support@yourcompany.com?subject=Escalation Request`;

  // Option 4: Show a modal with contact options
  // showContactModal();

  // Logs escalation to backend for tracking
  fetch("/api/escalations", { ... });
};
```

## Best Practices

1. **Always show the button**: When `escalationRequested` is true, always display the escalation option
2. **Make it prominent**: Use clear, visible styling for the escalation button (currently blue banner)
3. **Provide context**: Show the user why escalation was triggered (using `escalationReason`)
4. **Track escalations**: Log escalation events for analytics and training (already implemented)
5. **Follow up**: Ensure human support actually receives and responds to escalations
6. **Test regularly**: Verify escalation triggers work correctly with various phrasings
7. **Monitor false positives**: Check if escalation is being triggered unnecessarily
8. **Update keywords**: Add or remove keywords based on actual user conversations

## Example Implementation

See the chat interface components for reference implementations:

- `/components/chat/ChatbotChatInterface.tsx`
- `/components/chat/TraditionalChatInterface.tsx`
