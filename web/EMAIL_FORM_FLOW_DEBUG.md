# Email Form Injection Flow - Current vs Expected

## CATEGORY_SELECT Flow

### Fixed Flow (AFTER FIX):
```
1. User clicks category → Frontend sends category name as message
2. API receives message
3. API matches category
4. API creates USER message in DB ✅
5. API creates ASSISTANT message with category response in DB ✅
6. API creates email prompt message in DB ✅
7. API returns:
   - response: "We'd be happy to help you with X"
   - responseMessageId: <category response message ID> ✅ NEW
   - requiresEmail: true
   - emailPromptMessageId: <email prompt message ID>
8. Frontend receives response
9. Frontend creates assistant message with category response (using responseMessageId) ✅
10. Frontend adds email prompt message (using emailPromptMessageId) ✅
11. Frontend sets awaitingEmail = true ✅
12. Frontend sets emailPromptMessageId = <email prompt message ID> ✅
13. Frontend renders messages:
    - Category response message (id: responseMessageId)
    - Email prompt message (id: emailPromptMessageId)
14. Frontend checks: awaitingEmail && emailPromptMessageId === message.id ✅
15. Frontend shows email form after email prompt message ✅
```

### Message Flow Visualization:
```
Messages Array:
[
  { id: "user_123", role: "user", content: "Category Name" },
  { id: "response_456", role: "assistant", content: "We'd be happy to help you with Category Name." },
  { id: "email_prompt_789", role: "assistant", content: "In case we get disconnected, what's your business email address?" }
]

Email Form Rendering:
- Loop through messages
- For message with id === "email_prompt_789":
  - Check: awaitingEmail === true ✅
  - Check: emailPromptMessageId === "email_prompt_789" ✅
  - Check: currentChatId exists ✅
  - Render EmailForm component ✅
```

## AI_ASSISTANT/HUMAN Flow

### Fixed Flow (AFTER FIX):
```
1. User sees static message (from chatbot config)
2. User sends first message
3. API receives message
4. API creates USER message in DB ✅
5. API generates AI response ✅
6. API creates ASSISTANT message with AI response in DB ✅
7. API captures AI response message ID ✅ (FIXED)
8. API creates email prompt message in DB ✅
9. API returns:
   - response: <AI response>
   - responseMessageId: <AI response message ID> ✅ NEW
   - requiresEmail: true
   - emailPromptMessageId: <email prompt message ID>
10. Frontend receives response
11. Frontend creates assistant message with AI response (using responseMessageId) ✅
12. Frontend adds email prompt message (using emailPromptMessageId) ✅
13. Frontend sets awaitingEmail = true ✅
14. Frontend sets emailPromptMessageId = <email prompt message ID> ✅
15. Frontend renders messages:
    - AI response message (id: responseMessageId)
    - Email prompt message (id: emailPromptMessageId)
16. Frontend checks: awaitingEmail && emailPromptMessageId === message.id ✅
17. Frontend shows email form after email prompt message ✅
```

### Message Flow Visualization:
```
Messages Array:
[
  { id: "static_123", role: "assistant", content: "Static message from config" },
  { id: "user_456", role: "user", content: "User's first question" },
  { id: "ai_response_789", role: "assistant", content: "AI confirmation response" },
  { id: "email_prompt_012", role: "assistant", content: "In case we get disconnected, what's your business email address?" }
]

Email Form Rendering:
- Loop through messages
- For message with id === "email_prompt_012":
  - Check: awaitingEmail === true ✅
  - Check: emailPromptMessageId === "email_prompt_012" ✅
  - Check: currentChatId exists ✅
  - Render EmailForm component ✅
```

## Issue Analysis

### Root Cause:
The problem was in `/api/embed/chatbots/[id]/chat/route.ts`:

**AI_ASSISTANT Flow - Before Fix (Lines 287-325)**:
- ✅ Saves USER message
- ✅ Generates AI response
- ✅ Saves AI response message to DB
- ❌ Does NOT return responseMessageId in API response
- ✅ Creates email prompt message
- ✅ Returns AI response + requiresEmail + emailPromptMessageId

**AI_ASSISTANT Flow - After Fix**:
- ✅ Saves USER message
- ✅ Generates AI response
- ✅ Saves AI response message to DB
- ✅ Captures AI response message ID (FIXED)
- ✅ Creates email prompt message
- ✅ Returns AI response + responseMessageId + requiresEmail + emailPromptMessageId

**CATEGORY_SELECT Flow - Before Fix (Lines 189-212)**:
- ✅ Saves USER message
- ✅ Creates email prompt message
- ❌ Does NOT save the category response message to DB
- ✅ Returns category response in API response

**CATEGORY_SELECT Flow - After Fix**:
- ✅ Saves USER message
- ✅ Saves category response message to DB (FIXED)
- ✅ Creates email prompt message
- ✅ Returns category response + responseMessageId

### Additional Fix:
Frontend now uses `responseMessageId` from API response instead of generating a new ID, ensuring message IDs match between frontend and database.

## Debug Logs Added

All debug logs use the `📧` emoji prefix for easy filtering in the browser console:

1. **Email State Changes**: Logs when `awaitingEmail`, `hasEmail`, or `emailPromptMessageId` changes
2. **API Response Handling**: Logs when API indicates email is required
3. **Message Creation**: Logs when assistant and email prompt messages are added
4. **Email Form Rendering**: Logs for each message when checking if email form should be shown
5. **Email Submission**: Logs when email is submitted and chat is resumed

## Testing Checklist

- [ ] Category select flow shows email form after category response
- [ ] AI_ASSISTANT flow shows email form after first AI response
- [ ] Email form appears with correct message ID matching
- [ ] Email submission works and chat resumes correctly
- [ ] Debug logs show correct flow in browser console

