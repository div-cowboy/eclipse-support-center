# Embed Chat Persistence & Unread Messages Implementation

## Overview

This document describes the implementation of conversation loading and unread message tracking for embed chats in the Eclipse Support Center.

## Problem Solved

Previously, embed chats were stored in localStorage metadata only, but when users selected an existing chat from the list, the message history was not loaded from the database. This has been fixed with a comprehensive solution that also includes unread message tracking.

## Components

### 1. New API Endpoint: `/api/embed/chats/[id]`

**File**: `app/api/embed/chats/[id]/route.ts`

A public GET endpoint that:

- Returns chat data with full message history
- Requires no authentication (public for embed use)
- Only works for active chatbots
- Includes escalation status, assigned agent info, and message counts

**Example Response**:

```json
{
  "id": "chat_123",
  "title": "Embed Chat - 10/28/2025",
  "status": "ACTIVE",
  "escalationRequested": false,
  "messages": [
    {
      "id": "msg_1",
      "role": "USER",
      "content": "Hello",
      "createdAt": "2025-10-28T10:00:00Z",
      "userId": null
    },
    {
      "id": "msg_2",
      "role": "ASSISTANT",
      "content": "Hi! How can I help?",
      "createdAt": "2025-10-28T10:00:05Z",
      "userId": null
    }
  ],
  "chatbot": {
    "id": "bot_123",
    "name": "Support Bot",
    "description": "24/7 AI Support"
  },
  "_count": {
    "messages": 2
  }
}
```

### 2. Enhanced Local Storage (`lib/embed-chat-storage.ts`)

**New Fields in `ChatSession` Interface**:

```typescript
export interface ChatSession {
  id: string;
  chatbotId: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  preview?: string;
  lastViewedAt?: string; // NEW: When user last opened this chat
  unreadCount?: number; // NEW: Number of unread messages
}
```

**New Functions**:

- **`markChatAsViewed(chatId)`**: Marks a chat as viewed and clears unread count
- **`incrementUnreadCount(chatId)`**: Increments unread count for a chat
- **`calculateUnreadCount(chatId, latestMessageTime)`**: Calculates unread status based on timestamps

### 3. UniversalChatInterface Updates

**File**: `components/chat/UniversalChatInterface.tsx`

**Key Changes**:

- Added message loading for embed chats when `chatId` is provided
- Loads existing messages from `/api/embed/chats/[id]` endpoint
- Restores escalation state if chat was previously escalated
- Automatically enables real-time mode for escalated chats

**Code Flow**:

```typescript
// In loadChatInfo useEffect:
if (config.type === "embed" && config.chatId) {
  // Fetch chat with messages
  const chatResponse = await fetch(`/api/embed/chats/${config.chatId}`);
  const chatData = await chatResponse.json();

  // Load messages into state
  setMessages(mappedMessages);

  // Restore escalation state
  if (chatData.escalationRequested) {
    setEscalationActivated(true);
    setRealtimeMode(true);
  }
}
```

### 4. Embed Chat Page Updates

**File**: `app/embed/chat/page.tsx`

**Key Changes**:

1. **Import unread tracking functions**:

   ```typescript
   import { markChatAsViewed } from "@/lib/embed-chat-storage";
   ```

2. **Mark as viewed on chat selection**:

   ```typescript
   const handleSelectChat = useCallback(
     (selectedChatId: string) => {
       setChatId(selectedChatId);
       setView("chat");
       if (storageAvailable) {
         markChatAsViewed(selectedChatId);
       }
     },
     [storageAvailable]
   );
   ```

3. **Track viewed status during active chat**:

   ```typescript
   useEffect(() => {
     if (storageAvailable && chatId && view === "chat") {
       markChatAsViewed(chatId);
     }
   }, [storageAvailable, chatId, view]);
   ```

4. **Update lastViewedAt when sending messages**:
   ```typescript
   const handleMessageSent = useCallback(() => {
     if (storageAvailable && chatId) {
       const now = new Date().toISOString();
       updateChatSession(chatId, {
         lastMessageAt: now,
         lastViewedAt: now, // Keep marking as viewed during active use
       });
     }
   }, [chatId, storageAvailable]);
   ```

### 5. Chat List UI Updates with Real-Time

**File**: `components/chat/EmbedChatsList.tsx`

**Key Changes**:

0. **Real-time subscription for all chats**:

   ```typescript
   // Subscribe to real-time updates for all user's chats
   const chatIds = sessions.map((s) => s.id);
   useRealtimeChatList({
     chatIds,
     enabled: chatIds.length > 0,
     onMessageReceived: handleBackgroundMessage,
   });

   // Handle incoming messages from background chats
   const handleBackgroundMessage = useCallback(
     (message: ChatListMessage) => {
       // Only track messages from assistant/agent (not user's own messages)
       if (message.role === "assistant" || message.role === "agent") {
         // Update localStorage with new message timestamp
         updateChatSession(message.chatId, {
           lastMessageAt: message.timestamp.toISOString(),
           preview: `${message.senderName}: ${message.content.substring(
             0,
             50
           )}...`,
         });

         // Reload sessions to update UI
         loadSessions();
       }
     },
     [loadSessions]
   );
   ```

1. **Dynamic unread calculation**:

   ```typescript
   const loadSessions = useCallback(() => {
     const chatSessions = getChatSessions(chatbotId);

     const sessionsWithUnread = chatSessions.map((session) => {
       if (!session.lastViewedAt) {
         return { ...session, unreadCount: 0 };
       }

       const lastViewed = new Date(session.lastViewedAt);
       const lastMessage = new Date(session.lastMessageAt);
       const hasUnread = lastMessage > lastViewed;

       return {
         ...session,
         unreadCount: hasUnread ? 1 : 0,
       };
     });

     setSessions(sessionsWithUnread);
   }, [chatbotId]);
   ```

2. **Visual unread indicator**:
   ```tsx
   {
     (session.unreadCount || 0) > 0 && (
       <Badge variant="destructive" className="text-xs flex items-center gap-1">
         <Circle className="h-2 w-2 fill-current" />
         {session.unreadCount} new
       </Badge>
     );
   }
   ```

## How It Works

### Loading Existing Conversations

1. User opens embed chat widget
2. `EmbedChatsList` loads chat sessions from localStorage
3. User clicks on an existing chat
4. `handleSelectChat` is called:
   - Sets `chatId` state
   - Marks chat as viewed in localStorage
   - Switches to chat view
5. `UniversalChatInterface` detects `chatId` and `type === "embed"`
6. Fetches full chat history from `/api/embed/chats/[id]`
7. Loads messages into UI
8. Restores escalation state if applicable

### Unread Message Tracking

**Scenario 1: User Sends Message**

- Message timestamp recorded as `lastMessageAt`
- Simultaneously marked as `lastViewedAt` (user is viewing)
- Result: No unread indicator

**Scenario 2: AI Responds While User Viewing**

- `handleMessageSent` updates both timestamps
- Result: No unread indicator

**Scenario 3: User Returns to List After Time Away**

- `loadSessions` calculates: `lastMessageAt > lastViewedAt`
- If true, shows unread badge
- When user opens chat, `markChatAsViewed` clears indicator

**Scenario 4: Never Viewed Chat**

- If `lastViewedAt` is undefined
- Shows no unread indicator (avoiding false positives)

## Visual Indicators

### Chat List Item with Unread Messages

```
┌────────────────────────────────────┐
│ 💬  Chat abc12345                  │
│     2 msg  [🔴 1 new]              │
│     "Recent message"                │
│     ⏰ 5m ago                       │
└────────────────────────────────────┘
```

### Chat List Item - Normal

```
┌────────────────────────────────────┐
│ 💬  Chat xyz67890                  │
│     5 msg                           │
│     "Hello there"                   │
│     ⏰ 2h ago                       │
└────────────────────────────────────┘
```

## Benefits

1. **Conversation Continuity**: Users can return to previous conversations
2. **Real-Time Unread Detection**: Instant indicators when agents respond to background chats
3. **Escalation Persistence**: Escalated chats automatically reconnect to real-time mode
4. **No Authentication Required**: Works seamlessly in public embed contexts
5. **Performance**: Efficient localStorage-based metadata with on-demand message loading
6. **Zero Polling**: WebSocket-based real-time updates, no periodic API calls needed

## Key Features Implemented

### Unread Message Tracking

- Messages received while user is viewing the chat → Marked as read immediately
- Messages received while user is on list view or different chat → Shows unread badge
- Badge shows "🔴 1 new" indicator in chat list
- Automatically clears when user opens the chat

### Escalation Button Behavior

- Shows "Connect with Support" button initially
- Hides button after first escalation
- Button stays hidden when reopening escalated chats
- Real-time mode automatically activates for escalated chats

## Future Enhancements

Potential improvements:

- Periodic refresh of chat list when in list view (detect background messages from other chats)
- More granular unread counts (actual number of unread messages rather than just indicator)
- Push notifications for new messages in background chats
- Sync across multiple tabs using localStorage events
- Server-side session tracking for cross-device continuity

## Testing Checklist

- [ ] Create new embed chat and send messages
- [ ] Return to list and verify chat appears
- [ ] Click on existing chat and verify messages load
- [ ] Send message in chat, return to list, verify no unread indicator
- [ ] Simulate time passing (manually adjust localStorage timestamp)
- [ ] Return to list and verify unread indicator appears
- [ ] Open chat and verify unread indicator clears
- [ ] Test with escalated chats - verify real-time mode restores
- [ ] Test with multiple chats in localStorage
- [ ] Test chat deletion from list

## Related Files

- `app/api/embed/chats/[id]/route.ts` - New endpoint for loading chat history
- `lib/embed-chat-storage.ts` - Storage utilities
- `components/chat/UniversalChatInterface.tsx` - Chat interface
- `app/embed/chat/page.tsx` - Embed chat page
- `components/chat/EmbedChatsList.tsx` - Chat list UI with real-time
- `components/hooks/useRealtimeChat.ts` - Real-time hook for active chat
- `components/hooks/useRealtimeChatList.ts` - **NEW**: Real-time hook for background chats
