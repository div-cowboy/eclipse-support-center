# Embed Multi-Chat Feature

## Overview

The Eclipse Support Center iframe embed now supports multiple chat sessions with automatic persistence using browser localStorage. Users can start multiple conversations and easily navigate between them, with all chats persisted across browser sessions.

## Features

### 🔄 Chat Persistence

- All chat sessions are automatically saved to browser localStorage
- Chat IDs are stored as an array for each chatbot
- Sessions persist across browser refreshes and page navigations
- Maximum of 50 chats stored per browser to prevent storage overflow

### 📋 Chat List View

- View all your previous chat sessions in a clean list interface
- Each chat displays:
  - Unique chat identifier
  - Message count
  - Last message preview
  - Timestamp (relative time: "5m ago", "2h ago", etc.)
- Delete individual chats with confirmation
- Start new chats with a prominent button

### 💬 Chat View

- Individual chat interface with full conversation history
- Back button to return to chat list
- All existing features (streaming, escalation, etc.) work seamlessly

## User Experience

### Starting a New Chat

1. When the embed loads, users see the chat list view
2. Click "Start New Chat" to begin a new conversation
3. The chat session is automatically saved when the first message is sent

### Managing Multiple Chats

1. Click the "Chats" button (with back arrow) in any chat to return to the list
2. Select any previous chat from the list to resume the conversation
3. Delete unwanted chats using the trash icon (appears on hover)

### Chat List Empty State

When no chats exist yet:

- Friendly empty state with icon and message
- Clear call-to-action to start first chat
- Helpful description of what the chatbot does

## Technical Implementation

### localStorage Structure

```typescript
interface ChatSession {
  id: string; // Unique chat ID from API
  chatbotId: string; // Associated chatbot
  createdAt: string; // ISO timestamp
  lastMessageAt: string; // ISO timestamp of last activity
  messageCount: number; // Total messages in chat
  preview?: string; // Last message preview (100 chars)
}
```

### Storage Key

All chat sessions are stored under the key: `eclipse_embed_chats`

### Components

#### `lib/embed-chat-storage.ts`

Utility functions for managing localStorage:

- `getChatSessions(chatbotId?)` - Get all or filtered chat sessions
- `getChatSession(chatId)` - Get specific chat session
- `saveChatSession(session)` - Save or update a chat session
- `updateChatSession(chatId, updates)` - Update chat metadata
- `deleteChatSession(chatId)` - Delete a chat session
- `clearChatSessions(chatbotId?)` - Clear all or filtered sessions
- `getMostRecentChat(chatbotId)` - Get most recent chat for a chatbot
- `isStorageAvailable()` - Check if localStorage is available

#### `components/chat/EmbedChatsList.tsx`

React component displaying all chat sessions:

- Responsive list of all chats
- Empty state for first-time users
- Delete functionality with confirmation
- New chat creation button
- Formatted timestamps and previews

#### `app/embed/chat/page.tsx`

Main embed page with view management:

- Toggle between "list" and "chat" views
- Automatic localStorage updates on message send
- Navigation controls
- Session persistence

## Usage in Iframe

The feature works automatically when using the embed:

```html
<iframe
  src="https://your-domain.com/embed/chat?chatbotId=YOUR_CHATBOT_ID"
  width="100%"
  height="600px"
  style="border: none; border-radius: 8px;"
></iframe>
```

No additional configuration needed! The multi-chat feature is built-in.

## Browser Compatibility

- Works in all modern browsers that support localStorage
- Gracefully degrades if localStorage is unavailable (falls back to single-chat mode)
- No third-party dependencies required

## Privacy & Data

- All chat data is stored **locally** in the user's browser
- No server-side persistence of chat sessions (only live chat data)
- Users can clear their chat history by:
  - Deleting individual chats in the UI
  - Clearing browser localStorage
  - Clearing browser data/cookies

## Limitations

- Maximum 50 chats stored per chatbot per browser
- localStorage typically has a 5-10MB limit per domain
- Clearing browser data will remove all saved chats
- Chats are not synced across devices (local only)

## Future Enhancements

Potential improvements for future versions:

- Server-side chat history synchronization
- User authentication for cross-device sync
- Search functionality in chat list
- Chat categorization/folders
- Export chat history
- Bulk delete operations

