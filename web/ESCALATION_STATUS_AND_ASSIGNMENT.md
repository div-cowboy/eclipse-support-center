# Escalation Status and Assignment System

## Overview

This document describes the escalation status indicators and chat assignment ("Pick Up Chat") functionality for customer support representatives.

## Features Implemented

### 1. Database Schema Updates

Added the following fields to the `Chat` model:

- `escalationRequested` (Boolean) - Indicates if a user has requested human support
- `escalationReason` (String, optional) - The reason for the escalation
- `escalationRequestedAt` (DateTime, optional) - When the escalation was requested
- `assignedToId` (String, optional) - The ID of the user who picked up the chat
- `assignedAt` (DateTime, optional) - When the chat was assigned
- `assignedTo` (User relation) - The user who is assigned to the chat

### 2. Embed Chat Interface Updates

**File:** `/app/embed/chat/page.tsx`

#### Visual Status Indicators

- **Awaiting Support State**: When a chat is escalated, the header shows:

  - Amber/yellow badge with "Awaiting Response" text
  - Clock icon with pulse animation
  - Status text: "Connecting you with a support representative..."

- **Live Support State**: Once connected (simulated), the header shows:
  - Green badge with "Live" text
  - User icon in green
  - Status changes to show human representative

#### Header States

1. **Pre-escalation**: Shows AI bot icon and name
2. **Awaiting Support**: Shows amber badge with pulsing animation
3. **Live Support**: Shows green badge indicating active human support

### 3. Chat List Page Updates

**File:** `/app/app/chats/page.tsx`

#### New Table Columns

Added two new columns to the chats table:

1. **Escalation Column**

   - Shows amber badge with "Support Requested" if escalation is active
   - Includes phone icon
   - Shows "-" if no escalation

2. **Assigned To Column**
   - Shows green badge with assignee name/email if assigned
   - Includes UserCheck icon
   - Shows "Unassigned" if not picked up

#### Visual Indicators

- **Escalation Badge**: Amber/yellow with phone icon
- **Assignment Badge**: Green with user check icon

### 4. Chat Detail Page Updates

**File:** `/app/app/chats/[id]/page.tsx`

#### Header Badge

Added escalation badge to the header alongside chat type badge:

- Shows amber "Support Requested" badge when escalation is active
- Displays at the top of the page for immediate visibility

#### Chat Actions Card

New card positioned above "Chat Details" with the following sections:

##### Escalation Status (if applicable)

- Amber highlighted section
- Shows "Support Requested" title
- Displays escalation reason
- Shows when the request was made

##### Assignment Status

Shows one of two states:

**Unassigned State:**

- "Pick Up Chat" button
- Primary blue button with UserCheck icon
- Full width for prominence

**Assigned State:**

- Green highlighted section showing who it's assigned to
- Shows assignee name and timestamp
- "Release Chat" button to unassign
- Outline style to de-emphasize

#### Action Buttons

- **Pick Up Chat**: Assigns the chat to the current user
- **Release Chat**: Unassigns the chat (only available to assigned user)
- Loading states: "Picking Up..." / "Releasing..."

### 5. API Endpoints

#### Updated: POST `/api/escalations`

Now updates the chat record with escalation information:

- Sets `escalationRequested` to `true`
- Stores `escalationReason`
- Records `escalationRequestedAt` timestamp
- Logs escalation for analytics

#### New: POST `/api/chats/[id]/assign`

Assigns a chat to the current user:

- Verifies user has access to the chat
- Checks if chat is already assigned
- Assigns chat to current user
- Returns updated chat with assignment info

**Response:**

```json
{
  "success": true,
  "message": "Chat successfully assigned to you",
  "chat": { ...chatData }
}
```

**Error Cases:**

- 401: Unauthorized
- 403: No access to chat
- 404: Chat not found
- 409: Already assigned to another user

#### New: DELETE `/api/chats/[id]/assign`

Releases a chat assignment:

- Verifies user is the one assigned
- Removes assignment
- Returns updated chat

**Response:**

```json
{
  "success": true,
  "message": "Chat successfully released",
  "chat": { ...chatData }
}
```

### 6. API Data Updates

Updated the following endpoints to include escalation and assignment data:

- **GET `/api/chats`**: Returns list with escalation and assignment fields
- **GET `/api/chats/[id]`**: Returns single chat with full assignment details

All responses now include:

```typescript
{
  escalationRequested: boolean;
  escalationReason?: string;
  escalationRequestedAt?: Date;
  assignedToId?: string;
  assignedAt?: Date;
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
  };
}
```

## User Flow

### For End Users (Embed Chat)

1. User requests human support (escalation triggered)
2. Chat shows "Awaiting Response" badge with amber color
3. Header displays connection status message
4. Once picked up, shows "Live" green badge
5. User continues conversation with human representative

### For Support Representatives

1. View chats list with escalation indicators
2. See amber "Support Requested" badges for escalated chats
3. Click into chat to view details
4. See "Chat Actions" card at the top of sidebar
5. Review escalation reason and timestamp
6. Click "Pick Up Chat" to assign to self
7. Status changes to show assigned (green badge)
8. Can release chat if needed

## Visual Design

### Color System

- **Amber/Yellow**: Pending, awaiting support (warning state)
- **Green**: Active, assigned, live support (success state)
- **Blue**: AI chatbot, informational

### Icons

- **PhoneCall**: Escalation requested
- **Clock**: Awaiting/pending state
- **UserCheck**: Assigned
- **UserX**: Release/unassign
- **User**: Human representative

### Animations

- **Pulse animation**: Applied to "Awaiting Response" badge for attention
- **Smooth transitions**: Between states

## Database Migration

**Migration:** `20251026234401_add_escalation_and_assignment_fields`

Added fields to the `Chat` table:

```sql
ALTER TABLE "Chat"
ADD COLUMN "escalationRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "escalationReason" TEXT,
ADD COLUMN "escalationRequestedAt" TIMESTAMP(3),
ADD COLUMN "assignedToId" TEXT,
ADD COLUMN "assignedAt" TIMESTAMP(3);
```

Created indexes:

```sql
CREATE INDEX "Chat_escalationRequested_idx" ON "Chat"("escalationRequested");
CREATE INDEX "Chat_assignedToId_idx" ON "Chat"("assignedToId");
```

## Testing

### Test Scenarios

1. **Escalation Flow**

   - Trigger escalation in embed chat
   - Verify "Awaiting Response" badge appears
   - Check chat list shows escalation indicator
   - Verify escalation is logged in database

2. **Pick Up Flow**

   - Navigate to escalated chat detail page
   - Click "Pick Up Chat"
   - Verify assignment success
   - Check chat list shows assigned status

3. **Release Flow**

   - From assigned chat
   - Click "Release Chat"
   - Verify chat becomes unassigned

4. **Permissions**
   - Try to pick up chat from different organization (should fail)
   - Try to release chat not assigned to you (should fail)

## Future Enhancements

- Real-time notifications when chats are escalated
- Email/Slack notifications for support team
- Queue management for multiple support reps
- Auto-assignment based on availability
- SLA tracking for escalation response times
- Escalation analytics dashboard
- Re-assignment capability
- Team-based routing

## Related Files

- `/app/embed/chat/page.tsx` - Embed chat interface
- `/app/app/chats/page.tsx` - Chats list page
- `/app/app/chats/[id]/page.tsx` - Chat detail page
- `/app/api/escalations/route.ts` - Escalation logging
- `/app/api/chats/[id]/assign/route.ts` - Assignment endpoints
- `/app/api/chats/route.ts` - Chats list API
- `/app/api/chats/[id]/route.ts` - Single chat API
- `/prisma/schema.prisma` - Database schema

## Configuration

No additional configuration required. The system works out of the box with the existing authentication and organization structure.
