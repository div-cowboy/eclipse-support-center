# Anonymous User System

## Overview

The system creates **temporary user records** for anonymous chat sessions. This allows:

✅ Tracking multiple messages from the same anonymous user  
✅ Converting anonymous users to real users when they authenticate  
✅ Better analytics and support agent context  
✅ Future features like email capture and preferences

## How It Works

### 1. Anonymous Session Creation

When a user visits the embed chat without authentication:

```typescript
// In WebSocket token generation
const userId =
  session?.user?.id ||
  `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
// Example: "anon_1730401234_abc123"
```

### 2. Temporary User Record

When the anonymous user sends their first message:

```typescript
// In /api/chats/[id]/messages/send
const tempEmail = `${userId}@anonymous.temp`;
// Example: "anon_1730401234_abc123@anonymous.temp"

const tempUser = await prisma.user.create({
  data: {
    email: tempEmail,
    name: "Anonymous User",
    // No emailVerified - indicates temporary account
  },
});
```

**Database Record:**

```json
{
  "id": "user_cm123abc",
  "email": "anon_1730401234_abc123@anonymous.temp",
  "name": "Anonymous User",
  "emailVerified": null,
  "createdAt": "2025-10-31T18:00:00Z"
}
```

### 3. Message Association

All messages from this anonymous session are linked to the temporary user:

```sql
INSERT INTO "Message" (content, role, chatId, userId)
VALUES ('Hello!', 'USER', 'chat_123', 'user_cm123abc');
```

**Benefits:**

- Can track all messages from same anonymous user
- Support agents see consistent "sender" across messages
- Can analyze patterns (e.g., "This user sent 5 messages before escalating")

### 4. User Authentication & Conversion

When the anonymous user eventually signs in/signs up:

```typescript
import { convertTemporaryUser } from "@/lib/user-utils";

// After successful authentication
const tempUserId = "user_cm123abc"; // From session storage
const realUserId = session.user.id;

await convertTemporaryUser(tempUserId, realUserId);
// ✅ All messages now linked to real user
// ✅ Chat history preserved
// ✅ Temporary user deleted
```

## Implementation Details

### Identifying Temporary Users

**Temporary users have:**

1. Email ending in `@anonymous.temp`
2. `emailVerified` is `null`
3. Name is "Anonymous User" (can be updated)

**Query:**

```sql
SELECT * FROM "User"
WHERE email LIKE '%@anonymous.temp'
  AND "emailVerified" IS NULL;
```

### Session Continuity

The anonymous session ID (`anon_1730401234_abc123`) is stored in:

1. **WebSocket Token**: Includes the userId
2. **LocalStorage** (optional): Can persist across page refreshes
3. **Cookie** (optional): Can track across sessions

**Example flow:**

```
User visits embed chat
  ↓
Generate anon session: anon_1730401234_abc123
  ↓
Store in WebSocket token + localStorage
  ↓
User sends message
  ↓
Create temp user: anon_1730401234_abc123@anonymous.temp
  ↓
Link message to temp user
  ↓
User refreshes page
  ↓
Load anon session from localStorage
  ↓
Reuse same temp user
  ↓
All messages still linked! ✅
```

### Conversion Process

When user authenticates:

```typescript
// Example: After OAuth sign-in
async function handleAuthCallback(session: Session) {
  // Get anonymous session ID from localStorage
  const anonSessionId = localStorage.getItem("eclipse_anon_session");

  if (anonSessionId) {
    // Find temporary user
    const tempEmail = `${anonSessionId}@anonymous.temp`;
    const tempUser = await prisma.user.findUnique({
      where: { email: tempEmail },
    });

    if (tempUser) {
      // Convert to real user
      await convertTemporaryUser(tempUser.id, session.user.id);

      // Clear anonymous session
      localStorage.removeItem("eclipse_anon_session");

      console.log("✅ Anonymous history linked to authenticated user");
    }
  }
}
```

## API Functions

### `getOrCreateAnonymousUser(sessionId)`

Gets existing or creates new temporary user for an anonymous session.

```typescript
const userId = await getOrCreateAnonymousUser("anon_1730401234_abc123");
// Returns: "user_cm123abc"
```

### `convertTemporaryUser(tempUserId, realUserId)`

Converts temporary user to real user, linking all data.

```typescript
const result = await convertTemporaryUser("user_cm123abc", "user_real456");
// Returns: { messagesLinked: 5, chatsLinked: 1 }
```

### `isTemporaryUser(userId)`

Checks if a user is temporary.

```typescript
const isTemp = await isTemporaryUser("user_cm123abc");
// Returns: true
```

### `cleanupOldTemporaryUsers()`

Deletes inactive temporary users older than 30 days (cron job).

```typescript
const deleted = await cleanupOldTemporaryUsers();
// Returns: 42 (number deleted)
```

## Database Schema

No changes needed! Uses existing `User` model:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique        ← Uses this for temp emails
  emailVerified DateTime?                ← null = temporary
  // ... other fields
  messages      Message[]                ← Links messages
}
```

## Benefits vs Null userId

### With Temporary Users ✅

```sql
-- Find all messages from anonymous user across multiple chats
SELECT * FROM "Message" WHERE userId = 'user_cm123abc';

-- Count messages per anonymous user
SELECT userId, COUNT(*) FROM "Message"
WHERE userId IN (SELECT id FROM "User" WHERE email LIKE '%@anonymous.temp')
GROUP BY userId;

-- Link history when user authenticates
UPDATE "Message" SET userId = 'user_real456' WHERE userId = 'user_cm123abc';
```

### With Null userId ❌

```sql
-- Can't distinguish between different anonymous users
SELECT * FROM "Message" WHERE userId IS NULL;
-- ↑ Returns messages from ALL anonymous users mixed together

-- Can't link history when user authenticates
-- ↑ No way to know which null messages belong to which user
```

## Future Enhancements

### 1. Email Capture

```typescript
// Let anonymous users provide email before authenticating
async function captureAnonymousEmail(anonUserId: string, email: string) {
  await prisma.user.update({
    where: { id: anonUserId },
    data: {
      email: email, // Real email
      name: email.split("@")[0], // Better name
    },
  });
  // Now they're "identified" but not yet "authenticated"
}
```

### 2. Anonymous User Preferences

```typescript
// Store preferences even for anonymous users
const metadata = {
  language: "en",
  timezone: "America/New_York",
  lastSeen: new Date(),
};

await prisma.user.update({
  where: { id: anonUserId },
  data: { metadata },
});
```

### 3. Cross-Device Continuity

```typescript
// Generate QR code or magic link to continue chat on another device
const continueToken = generateSecureToken(anonUserId);
// User scans QR code → continues same session on phone
```

### 4. Analytics Dashboard

```typescript
// Track anonymous user behavior
SELECT
  COUNT(DISTINCT u.id) as anonymous_users,
  AVG(message_count) as avg_messages_per_user,
  COUNT(CASE WHEN u.emailVerified IS NOT NULL THEN 1 END) as converted_users
FROM "User" u
LEFT JOIN (
  SELECT userId, COUNT(*) as message_count
  FROM "Message"
  GROUP BY userId
) m ON u.id = m.userId
WHERE u.email LIKE '%@anonymous.temp';
```

## Maintenance

### Cron Job (Daily)

```typescript
// In your cron job file
import { cleanupOldTemporaryUsers } from "@/lib/user-utils";

export async function dailyCleanup() {
  await cleanupOldTemporaryUsers();
}
```

### Manual Cleanup

```sql
-- Find inactive temporary users
SELECT u.*, COUNT(m.id) as message_count
FROM "User" u
LEFT JOIN "Message" m ON u.id = m.userId
WHERE u.email LIKE '%@anonymous.temp'
  AND u."emailVerified" IS NULL
  AND u."updatedAt" < NOW() - INTERVAL '30 days'
GROUP BY u.id
HAVING COUNT(m.id) = 0;

-- Delete them
DELETE FROM "User"
WHERE email LIKE '%@anonymous.temp'
  AND "emailVerified" IS NULL
  AND "updatedAt" < NOW() - INTERVAL '30 days'
  AND id NOT IN (SELECT DISTINCT userId FROM "Message" WHERE userId IS NOT NULL);
```

## Testing

```typescript
// Test anonymous user creation
const userId1 = await getOrCreateAnonymousUser("anon_test_123");
const userId2 = await getOrCreateAnonymousUser("anon_test_123");
assert(userId1 === userId2); // Same session = same user ✅

// Test conversion
const tempId = await getOrCreateAnonymousUser("anon_test_456");
await prisma.message.create({
  data: { content: "Test", role: "USER", chatId: "chat_1", userId: tempId },
});

const realId = "real_user_789";
await convertTemporaryUser(tempId, realId);

const messages = await prisma.message.findMany({ where: { userId: realId } });
assert(messages.length > 0); // Messages linked ✅
```

---

**Status**: ✅ Implemented  
**Date**: October 31, 2025
