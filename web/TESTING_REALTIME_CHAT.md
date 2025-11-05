# Real-Time Chat Testing Guide

## Step-by-Step Test Procedure

### Setup

1. Open the embed iframe in one browser window
2. Open `/app/chats` in another browser window (logged in as agent)
3. Open browser console in BOTH windows

### Test Flow

#### Part 1: Customer Escalates

1. **In iframe**: Send a message: "I need help"
2. **Check logs**: Should see `[EmbedChat] Chat created: [ID]`
3. **In iframe**: Send: "I want to speak to a human"
4. **Check AI response**: AI should acknowledge and show blue "Connect with Customer Support" button
5. **In iframe**: Click "Connect with Customer Support"
6. **Check logs**: Should see:
   ```
   ✅ Escalation logged successfully
   ✅ Real-time mode activated
   [useRealtimeChat] ✅ Subscribing to chat:[ID]
   [useRealtimeChat] ✅ Successfully subscribed
   ```
7. **Verify**: Should see "⏱️ Connecting you to a support agent. Please wait..."

#### Part 2: Agent Picks Up Chat

8. **In agent window**: Refresh `/app/chats` page
9. **Check list**: Should see chat with 🚨 badge in "Needs Response" filter
10. **Click chat**: Opens `/app/chats/[ID]`
11. **Check logs**: Should see:
    ```
    [ChatDetailPage] Fetching chat: [ID]
    [ChatDetailPage] Chat data loaded: {
      escalationRequested: true,  ← MUST BE TRUE
      assignedToId: null
    }
    [ChatDetailPage] Creating chat config: {
      realtimeMode: true  ← MUST BE TRUE
    }
    [useRealtimeChat] ✅ Subscribing to chat:[ID]
    [useRealtimeChat] ✅ Successfully subscribed
    ```
12. **Verify**: Should see full AI conversation history

#### Part 3: Agent Assigns Themselves

13. **In agent window**: Click "Assign to Me" button
14. **Check logs**: Should see:
    ```
    [ChatDetailPage] Picking up chat: [ID]
    [ChatDetailPage] Chat assigned successfully: {...}
    📢 Broadcasted agent_joined event for chat:[ID]
    ```
15. **In iframe**: Check if you see "✅ You're now connected to [Agent Name]"
    - **If YES**: ✅ Real-time working!
    - **If NO**: ❌ Event not being received

#### Part 4: Real-Time Chat

16. **In iframe**: Send message: "Hi, I'm here"
17. **Check iframe logs**:
    ```
    [UniversalChatInterface] sendMessage called: {realtimeMode: true}
    [UniversalChatInterface] Using REAL-TIME mode
    [useRealtimeChat] Sending message to chat:[ID]
    [useRealtimeChat] Message sent successfully: [msg_id]
    ```
18. **In agent window**: Should see message appear instantly
19. **Check agent logs**: Should see:

    ```
    [useRealtimeChat] Received message: {...}
    ```

20. **In agent window**: Send message: "How can I help?"
21. **Check agent logs**:
    ```
    [UniversalChatInterface] sendMessage called: {realtimeMode: true}
    [UniversalChatInterface] Using REAL-TIME mode: {messageRole: "ASSISTANT"}
    [useRealtimeChat] Sending message to chat:[ID]
    ```
22. **In iframe**: Should see agent's message appear instantly
23. **Check iframe logs**: Should see:
    ```
    [useRealtimeChat] Received message: {...}
    ```

## Common Issues

### Issue 1: "enabled: false" in iframe after escalation

**Symptom**:

```
[useRealtimeChat] Not subscribing - disabled {enabled: false, chatId: "xxx"}
```

**Cause**: `isEscalated` state not being set to true

**Solution**: Check `handleEscalationRequested` sets `setIsEscalated(true)`

### Issue 2: Agent getting AI responses

**Symptom**: Agent sends message, sees "Thank you for your message..." response

**Log to check**:

```
[UniversalChatInterface] sendMessage called: {realtimeMode: false}  ← WRONG!
[UniversalChatInterface] Using AI mode (not real-time)
```

**Cause**: `realtimeMode` is false when it should be true

**Solution**:

- Check `escalationRequested` is true in DB
- Check `chatConfig.features.realtimeMode` is being set correctly
- Verify `chat.escalationRequested` value when creating config

### Issue 3: Subscribe/Unsubscribe Loop

**Symptom**:

```
[useRealtimeChat] ✅ Subscribing...
[useRealtimeChat] Unsubscribing...
[useRealtimeChat] ✅ Subscribing...
[useRealtimeChat] Unsubscribing...
```

**Cause**: Config object being recreated on every render

**Solution**: Use `useMemo` to stabilize config (already implemented)

### Issue 4: Agent joined message not showing

**Symptom**: Agent assigns but customer doesn't see "You're now connected to..."

**Check these logs**:

**Agent side:**

```
📢 Broadcasted agent_joined event for chat:[ID]  ← Must see this
```

**Customer side:**

```
🎉 AGENT JOINED EVENT RECEIVED: {...}  ← Must see this
✅ Agent joined message added to chat
```

**If agent broadcast is missing**: Check `/api/chats/[id]/assign` has EventEmitter code

**If customer not receiving**: Check customer's `useRealtimeChat` is subscribed to same chatId

## Expected Full Log Sequence

### Customer (Iframe):

```
1. [EmbedChat] Chat created: cm3abc
2. 📝 Chat ID captured
3. ✅ Escalation logged successfully
4. [EmbedChat] Escalation completed, enabling real-time mode
5. [useRealtimeChat] ✅ Subscribing to chat:cm3abc
6. [useRealtimeChat] ✅ Successfully subscribed
7. (wait for agent...)
8. 🎉 AGENT JOINED EVENT RECEIVED
9. ✅ Agent joined message added to chat
10. [useRealtimeChat] Sending message...
11. [useRealtimeChat] Received message... (echo from agent)
```

### Agent (Chats Page):

```
1. [ChatDetailPage] Fetching chat: cm3abc
2. [ChatDetailPage] Chat data loaded: {escalationRequested: true}
3. [ChatDetailPage] Creating chat config: {realtimeMode: true}
4. [useRealtimeChat] ✅ Subscribing to chat:cm3abc
5. [useRealtimeChat] ✅ Successfully subscribed
6. [ChatDetailPage] Picking up chat
7. 📢 Broadcasted agent_joined event
8. [UniversalChatInterface] sendMessage called: {realtimeMode: true}
9. [UniversalChatInterface] Using REAL-TIME mode: {messageRole: "ASSISTANT"}
10. [useRealtimeChat] Sending message...
11. [useRealtimeChat] Received message... (echo from customer)
```

## Debug Checklist

- [ ] Customer can escalate successfully
- [ ] Customer's real-time mode activates (check logs)
- [ ] Customer's useRealtimeChat subscribes (check logs)
- [ ] Agent sees escalated chat in list
- [ ] Agent's chat loads with escalationRequested: true
- [ ] Agent's realtimeMode is set to true (check logs)
- [ ] Agent's useRealtimeChat subscribes (check logs)
- [ ] No subscribe/unsubscribe loops on either side
- [ ] Agent assignment broadcasts agent_joined event
- [ ] Customer receives agent_joined event
- [ ] Customer sees "You're now connected to [Name]"
- [ ] Customer messages appear on agent side
- [ ] Agent messages appear on customer side
- [ ] All messages persist in database

## Quick Check Commands

### Check if chat is escalated in DB:

```sql
SELECT id, title, escalationRequested, assignedToId
FROM "Chat"
WHERE id = 'YOUR_CHAT_ID';
```

### Check messages in chat:

```sql
SELECT id, content, role, createdAt
FROM "Message"
WHERE chatId = 'YOUR_CHAT_ID'
ORDER BY createdAt ASC;
```

### Expected message roles after pickup:

- USER: Customer messages
- AGENT: AI bot responses (before escalation)
- ASSISTANT: Human agent responses (after escalation)
- SYSTEM: System notifications (escalation, agent joined, etc.)
