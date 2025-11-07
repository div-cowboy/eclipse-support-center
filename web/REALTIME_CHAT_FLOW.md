# Real-Time Chat Flow

## Overview
When a customer sends a message in real-time mode, the system uses WebSocket to broadcast messages instantly to all connected clients.

## Flow Diagram

```
Customer sends message
    ↓
UniversalChatInterface.sendMessage()
    ↓
Check: realtimeMode && currentChatId?
    ↓ YES
sendRealtimeMessage() [from useRealtimeChat hook]
    ↓
WebSocket.send() → WebSocket Server
    ↓
WebSocket Server → /api/chats/[id]/messages/send
    ↓
API saves message to DB + publishes to Redis
    ↓
WebSocket Server broadcasts to all connected clients
    ↓
Frontend receives via ws.onmessage
    ↓
onMessage callback triggered
    ↓
Message added to UI
```

## Key Components

1. **UniversalChatInterface** - Main chat component
   - Checks if `realtimeMode && currentChatId` is true
   - If yes, routes to real-time system
   - If no, routes to AI system

2. **useRealtimeChat hook** - Wrapper that selects WebSocket or Supabase
   - Currently uses WebSocket implementation
   - Manages WebSocket connection lifecycle
   - Handles message sending/receiving

3. **useWebSocketChat hook** - WebSocket implementation
   - Connects to WebSocket server
   - Sends messages via WebSocket
   - Receives messages via `ws.onmessage`
   - Triggers `onMessage` callback

4. **WebSocket Server** - Custom WebSocket server
   - Receives messages from clients
   - Saves to DB via API
   - Broadcasts to all connected clients

5. **API Route** - `/api/chats/[id]/messages/send`
   - Saves message to database
   - Publishes to Redis for cross-server broadcasting

## Debugging Points

1. **Message Send**: Check if `sendRealtimeMessage` is called
2. **WebSocket Connection**: Check if WebSocket is connected
3. **Message Broadcast**: Check if message is saved and broadcast
4. **Message Receive**: Check if `onMessage` callback is triggered
5. **UI Update**: Check if message is added to messages array

