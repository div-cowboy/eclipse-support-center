# Dynamic Message Alignment Implementation

## Overview

Implemented a mechanism in the `UniversalChatInterface` to dynamically position chat messages based on who is viewing the chat, rather than using a fixed role-based positioning system.

## Problem Statement

Previously, messages were positioned based solely on their role:

- All "user" messages appeared on the right
- All other messages (assistant, agent, system) appeared on the left

This created a confusing experience when support agents viewed chats, as they would see customer messages on the right (their own messages should be on the right from their perspective).

## Solution

Implemented a user ID comparison system that positions messages based on whether the message sender is the current viewer:

- **Your own messages** → right side (blue bubble with avatar)
- **Other people's messages** → left side (gray/colored bubble with avatar)

## Changes Made

### 1. Updated `ChatMessage` Interface

**File:** `components/chat/UniversalChatInterface.tsx`

Added `userId` field to track the sender of each message:

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  timestamp: Date;
  userId?: string; // ID of the user who sent this message
  metadata?: { ... };
}
```

### 2. Updated `ChatConfig` Interface

**File:** `components/chat/UniversalChatInterface.tsx`

Added `currentUserId` to the configuration to identify the current viewer:

```typescript
export interface ChatConfig {
  // ... other fields
  currentUserId?: string; // ID of the current user viewing the chat
  // ... other fields
}
```

### 3. Updated Message Alignment Logic

**File:** `components/chat/UniversalChatInterface.tsx`

Changed from role-based to user-based positioning:

```typescript
// Determine if this message is from the current user
// Use userId comparison if available, otherwise fall back to role-based logic
const isOwnMessage = config.currentUserId && message.userId
  ? message.userId === config.currentUserId
  : message.role === "user";

// Apply alignment
<div className={`flex gap-3 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
```

### 4. Updated Avatar Display Logic

**File:** `components/chat/UniversalChatInterface.tsx`

- **Left side avatar:** Shows for other people's messages (not own messages)
- **Right side avatar:** Shows for own messages
- **Avatar icons:** Bot icon for assistant/agent, User icon for others

### 5. Updated Message Bubble Styling

**File:** `components/chat/UniversalChatInterface.tsx`

Bubbles now use `isOwnMessage` instead of checking `message.role === "user"`:

```typescript
<div className={`rounded-lg px-3 py-2 ${
  isOwnMessage
    ? "bg-primary text-primary-foreground"  // Own messages
    : message.role === "system"
      ? "bg-orange-100 text-orange-800 ..."  // System messages
      : message.role === "agent"
        ? "bg-blue-600 text-white"            // Agent messages
        : "bg-muted"                          // Other messages
}`}>
```

### 6. Updated Sender Labels (Traditional Chat)

**File:** `components/chat/UniversalChatInterface.tsx`

Labels now show "You" for the current user's messages:

```typescript
{
  config.type === "traditional" && (
    <span
      className={`text-xs text-muted-foreground px-1 ${
        isOwnMessage ? "text-right" : "text-left"
      }`}
    >
      {isOwnMessage
        ? "You"
        : message.role === "agent"
        ? "AI Agent"
        : message.role === "assistant"
        ? chatInfo?.assignedTo?.name || "Support Agent"
        : "System"}
    </span>
  );
}
```

### 7. Updated Real-Time Message Handling

**File:** `components/chat/UniversalChatInterface.tsx`

Real-time messages now include the sender's ID:

```typescript
const chatMessage: ChatMessage = {
  id: message.id,
  role: message.role,
  content: message.content,
  timestamp: new Date(message.timestamp),
  userId: message.sender.id, // Include sender ID for message alignment
};
```

Optimistic UI updates also include the current user's ID:

```typescript
const optimisticMessage: ChatMessage = {
  id: `optimistic_${Date.now()}`,
  role: messageRole === "ASSISTANT" ? "assistant" : "user",
  content: message,
  timestamp: new Date(),
  userId: config.currentUserId, // Include current user ID for message alignment
};
```

### 8. Updated Support Chat Page

**File:** `app/app/chats/[id]/page.tsx`

Added session support to get current user's ID:

```typescript
import { useSession } from "next-auth/react";

export default function ChatDetailPage() {
  const { data: session } = useSession();
  // ...

  const chatConfig = useMemo(() => {
    return {
      // ...
      currentUserId: session?.user?.id, // Pass current user ID for message alignment
      // ...
    };
  }, [chat, session?.user?.id]);
}
```

## How It Works

### Fallback Logic

The system uses a smart fallback approach:

1. **If both `currentUserId` and `message.userId` are available:** Compare them to determine alignment
2. **Otherwise:** Fall back to context-aware role-based logic:
   - **In support view** (`config.features.supportView === true`):
     - `role === "assistant"` AND message timestamp ≥ `assignedAt` → Own message (right side) - Human agent
     - `role === "assistant"` AND message timestamp < `assignedAt` → Bot message (left side) - AI bot
     - `role === "user"` → Customer message (left side)
     - `role === "agent"` → AI agent message (left side)
   - **In customer view** (`config.features.supportView === false`):
     - `role === "user"` → Own message (right side)
     - `role === "assistant"` or `role === "agent"` → Bot/Agent message (left side)

```typescript
const isOwnMessage =
  config.currentUserId && message.userId
    ? message.userId === config.currentUserId
    : config.features.supportView
    ? // In support view, only post-assignment assistant messages are "own"
      message.role === "assistant" &&
      chatInfo?.assignedAt &&
      new Date(message.timestamp) >= new Date(chatInfo.assignedAt)
    : message.role === "user"; // In customer view, user messages are "own"
```

### Sender Label Logic

The sender labels are determined by an IIFE that checks multiple conditions:

```typescript
{
  (() => {
    // If it's the current user's message
    if (isOwnMessage) {
      return "You";
    }

    // For customer messages
    if (message.role === "user") {
      return config.features.supportView ? "Customer" : "You";
    }

    // For AI agent/bot messages
    if (message.role === "agent") {
      return "AI Agent";
    }

    // For assistant messages - distinguish between bot and human agent
    if (message.role === "assistant") {
      // If chat is assigned and message is after assignment, it's from human agent
      if (
        chatInfo?.assignedAt &&
        new Date(message.timestamp) >= new Date(chatInfo.assignedAt)
      ) {
        return chatInfo?.assignedTo?.name || "Support Agent";
      }
      // Otherwise it's from the AI bot
      return "AI Assistant";
    }

    // System messages
    return "System";
  })();
}
```

This ensures backward compatibility and works correctly for:

- **Authenticated users** (support agents) - Gets proper alignment based on userId OR timestamp-aware role-based logic
- **Embed chats** (anonymous users) - Falls back to role-based alignment with customer perspective
- **Legacy messages** (without userId) - Falls back to context-aware role-based alignment using assignment timestamp
- **Bot vs Human distinction** - Uses assignment timestamp to differentiate between AI bot and human agent messages

### Data Flow

1. **Message Creation:**
   - User sends message → includes their userId
   - Message stored in database with userId field
2. **Message Retrieval:**
   - API returns messages with userId field (Prisma includes it by default)
   - Frontend receives and displays messages
3. **Message Display:**
   - Component compares `message.userId` with `config.currentUserId`
   - Applies appropriate alignment and styling
4. **Real-Time Updates:**
   - Real-time messages include `sender.id` field
   - Mapped to `userId` when creating ChatMessage object
   - Optimistic UI updates use `config.currentUserId`

## Database Schema

The Message model already had the necessary `userId` field:

```prisma
model Message {
  id        String      @id @default(cuid())
  content   String
  role      MessageRole
  metadata  Json?
  chatId    String
  userId    String?     // ← This field enables the feature
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  chat      Chat        @relation(...)
  user      User?       @relation(...)
}
```

## Benefits

1. **Intuitive UX:** Users always see their own messages on the right, regardless of their role
2. **Perspective-Based:** Support agents see customer messages on the left, their responses on the right
3. **Consistent:** Works across all chat types (traditional, chatbot, embed, real-time)
4. **Backward Compatible:** Falls back to role-based logic when userId is not available
5. **Future-Proof:** Easily extensible for multi-user chat scenarios

## Testing Recommendations

1. **Support Agent View:**

   - Log in as a support agent
   - Open an escalated chat
   - Verify your messages appear on the right
   - Verify customer messages appear on the left

2. **Customer View:**

   - Use embed chat widget (anonymous)
   - Send messages
   - Verify your messages appear on the right
   - Verify bot/agent responses appear on the left

3. **Real-Time Chat:**

   - Escalate a chat
   - Have both customer and agent send messages
   - Verify each party sees their own messages on the right

4. **Legacy Messages:**
   - View old chats that don't have userId
   - Verify fallback logic works correctly

## Troubleshooting

### Issue: Messages appear on wrong side in support view

**Symptoms:** When viewing as a support agent, customer messages appear on the right side instead of left.

**Cause:** Messages don't have `userId` populated, and the fallback logic needs the `supportView` flag to be set correctly.

**Solution:**

1. Verify `config.features.supportView` is set to `true` in the support agent view
2. Check that messages have `userId` field populated in the API response
3. Ensure the chat config includes `currentUserId` from the session

**Debug steps:**

```typescript
// Add console logging to check the values
console.log({
  messageUserId: message.userId,
  currentUserId: config.currentUserId,
  messageRole: message.role,
  supportView: config.features.supportView,
  isOwnMessage: isOwnMessage,
});
```

### Issue: Legacy messages (without userId) show incorrectly

**Cause:** Old messages in the database don't have `userId` populated.

**Solution:** The fallback logic should handle this automatically based on `supportView`. If not working:

1. Check that `supportView` is properly set in the config
2. Consider running a migration to populate `userId` for existing messages
3. Verify the message `role` is correct in the database

## Future Enhancements

1. **Group Chats:** Could be extended to show other users' avatars/names
2. **Message Reactions:** Could be position-aware based on message alignment
3. **Reply Threading:** Could use alignment to show conversation flow
4. **Read Receipts:** Could be positioned based on message alignment
5. **Migration Script:** Populate `userId` for existing messages based on their role and chat context

## Notes

- The `userId` field is optional to maintain backward compatibility
- The feature is transparent to embed widgets (they don't need to change)
- No database migrations were required (field already existed)
- Session handling uses NextAuth's `useSession` hook for client components
- **Critical:** The fallback logic is context-aware - it considers whether the viewer is a support agent or customer
