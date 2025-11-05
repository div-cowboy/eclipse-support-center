# Chat-to-Ticket Handoff Implementation Plan

## Overview

This plan outlines the implementation of a seamless handoff process from chat to ticket, along with ticket management improvements including assignment UI and UniversalChat integration for ticket responses.

---

## Phase 1: Add "Create Ticket" Button to Chat Actions

### Objectives

- Add a "Create Ticket" button in the chat detail page's "Chat Actions" card
- Wire up the existing `CreateTicketFromChatModal` component
- Ensure the button is visible and properly styled for support agents

### Tasks

1. **Update Chat Detail Page** (`app/app/chats/[id]/page.tsx`)

   - Add "Create Ticket" button to the "Chat Actions" card
   - Button should be visible for support agents (when `supportView` is enabled)
   - Wire up `CreateTicketFromChatModal` state management
   - Pass required props: `chatId`, `organizationId` (from chat's chatbot organization)
   - Handle success callback to navigate to created ticket or show notification

2. **Verify UniversalChatInterface Integration**

   - Check if `CreateTicketFromChatModal` is properly imported and rendered
   - Ensure `showTicketModal` state is accessible or create separate state in chat detail page
   - Verify `organizationId` is available in chat data (from chatbot.organizationId)

3. **UI/UX Considerations**
   - Button placement: In the "Chat Actions" card, below assignment actions
   - Button styling: Use primary variant for visibility
   - Icon: Use Ticket icon from lucide-react
   - Disable button if chat doesn't have required organizationId
   - Show loading state during ticket creation

### Acceptance Criteria

- [ ] "Create Ticket" button appears in Chat Actions card on chat detail page
- [ ] Clicking button opens CreateTicketFromChatModal with pre-filled data
- [ ] Ticket is created with chat data properly linked
- [ ] User is redirected to new ticket or shown success notification
- [ ] Button is disabled when organizationId is unavailable

---

## Phase 2: Ticket Assignment UI

### Objectives

- Add UI to change ticket assignment on the ticket detail page
- Allow support agents to assign tickets to themselves or other agents
- Display current assignment status clearly

### Tasks

1. **Create User/Agent Selector Component**

   - Create a reusable component for selecting users/agents
   - Support filtering by organization
   - Display user name and email
   - Support "Unassign" option

2. **Update Ticket Detail Page** (`app/app/tickets/[id]/page.tsx`)

   - Replace static "Assigned To" display with interactive Select component
   - Use existing `/api/tickets/[id]` PATCH endpoint to update `assignedToId`
   - Fetch list of users in the ticket's organization
   - Add "Assign to Me" quick action button
   - Show loading state during assignment updates
   - Display assignment timestamp

3. **API Enhancement** (if needed)

   - Verify `/api/tickets/[id]` PATCH endpoint handles `assignedToId` updates
   - Ensure activity log is created when assignment changes
   - Verify permission checks are in place

4. **UI/UX Improvements**
   - Update sidebar "Assigned To" section to use Select dropdown
   - Show current user prominently if assigned
   - Add visual indicator for self-assignment
   - Show assignment history in activity log

### Acceptance Criteria

- [ ] Ticket detail page shows interactive assignment selector
- [ ] Support agents can assign tickets to themselves or other agents
- [ ] Support agents can unassign tickets
- [ ] Assignment changes are logged in activity log
- [ ] UI updates immediately after assignment change
- [ ] Permission checks prevent unauthorized assignment changes

---

## Phase 3: UniversalChat Integration for Ticket Responses

### Objectives

- Replace `TicketResponseForm` with `UniversalChatInterface` for ticket responses
- Create a new "ticket" mode for UniversalChat
- Maintain all existing functionality (internal notes, email sending, etc.)
- Provide better UX for ticket conversations

### Tasks

1. **Extend UniversalChatInterface Configuration**

   - Add `"ticket"` as a new chat type in `ChatConfig.type`
   - Add ticket-specific features:
     - `ticketId`: Identifier for the ticket
     - `showInternalNotes`: Toggle for internal vs customer-visible responses
     - `showEmailToggle`: Option to send email with response
     - `ticketMode`: Specific mode for ticket responses
   - Update `ChatMessage` interface to support ticket response metadata

2. **Create Ticket Response API Integration**

   - Create or update API endpoint to handle ticket responses via chat-like interface
   - Map ticket responses to chat message format:
     - `TicketResponse` → `ChatMessage`
     - Include `isInternal` flag in message metadata
     - Include `isEmailSent` flag in message metadata
     - Preserve author information
   - Support real-time updates for ticket responses (optional, for future)

3. **Update Ticket Detail Page**

   - Replace `TicketResponseForm` section with `UniversalChatInterface`
   - Configure UniversalChat with ticket mode:
     ```typescript
     {
       type: "ticket",
       ticketId: ticket.id,
       apiEndpoint: `/api/tickets/${ticket.id}/responses`,
       features: {
         showInternalNotes: true,
         showEmailToggle: true,
         supportView: true,
         realtimeMode: false, // Can be enabled later
       }
     }
     ```
   - Load existing ticket responses as chat messages
   - Display internal notes differently (yellow/amber styling)
   - Show email sent indicator on responses

4. **Create Ticket Response Handler**

   - Create new API endpoint or extend existing one:
     - `POST /api/tickets/[id]/responses` (update existing)
     - Accept chat-like message format
     - Convert to `TicketResponse` format
     - Handle internal notes flag
     - Handle email sending flag
     - Return response in chat message format

5. **UI/UX Enhancements**

   - Add toggle for "Internal Note" in UniversalChat input area
   - Add toggle for "Send Email" when not internal
   - Style internal notes differently (similar to current yellow badge)
   - Show message indicators (internal, email sent, etc.)
   - Display ticket responses in chronological order
   - Show author information clearly

6. **Message Format Conversion**
   - Create utility functions to convert between:
     - `TicketResponse` ↔ `ChatMessage`
   - Handle metadata mapping:
     - `isInternal` → message metadata
     - `isEmailSent` → message metadata
     - `authorName`, `authorEmail` → message user info
     - `createdAt` → message timestamp

### Acceptance Criteria

- [ ] UniversalChatInterface supports "ticket" mode
- [ ] Ticket detail page uses UniversalChat instead of TicketResponseForm
- [ ] All existing ticket response functionality works (internal notes, email sending)
- [ ] Ticket responses display in chat format
- [ ] Internal notes are visually distinct
- [ ] Email sent indicator is visible
- [ ] Responses can be added via UniversalChat interface
- [ ] Existing responses are loaded and displayed correctly

---

## Phase 4: Enhanced Features and Polish

### Objectives

- Add additional UX improvements
- Handle edge cases
- Add navigation between related chats and tickets

### Tasks

1. **Cross-Navigation**

   - Add "View Related Chat" link in ticket detail when `originChatId` exists
   - Add "View Related Ticket" link in chat detail when tickets exist
   - Show ticket count in chat detail sidebar
   - Show chat link in ticket detail sidebar

2. **Assignment Improvements**

   - Add "Assign to Me" quick action in ticket list view
   - Show assignment status in ticket list
   - Add bulk assignment (future consideration)

3. **UniversalChat Mode-Specific UI**

   - Add ticket-specific header/badge in UniversalChat when in ticket mode
   - Show ticket status and priority in chat header (optional)
   - Add ticket actions menu (if needed)

4. **Error Handling**

   - Handle API errors gracefully
   - Show user-friendly error messages
   - Retry failed operations

5. **Performance Optimizations**
   - Lazy load ticket responses
   - Optimize message rendering for large ticket histories
   - Add pagination if needed

### Acceptance Criteria

- [ ] Navigation between related chats and tickets works
- [ ] Quick assignment actions are available
- [ ] Error handling is user-friendly
- [ ] Performance is acceptable with large ticket histories
- [ ] All edge cases are handled gracefully

---

## Technical Considerations

### API Endpoints

- `POST /api/tickets/from-chat/[chatId]` - Already exists
- `PATCH /api/tickets/[id]` - Already exists, supports `assignedToId`
- `POST /api/tickets/[id]/responses` - Already exists, may need updates for chat format
- `GET /api/tickets/[id]` - Already exists
- `GET /api/users?organizationId=...` - May need to create for agent selection

### Database Schema

- No schema changes needed
- Existing relationships support all features:
  - `Ticket.originChatId` links tickets to chats
  - `Ticket.assignedToId` links tickets to users
  - `TicketResponse` stores all response data

### Components to Create/Modify

- **Create:**
  - `components/tickets/UserSelector.tsx` (for assignment selection)
- **Modify:**
  - `app/app/chats/[id]/page.tsx` (add Create Ticket button)
  - `app/app/tickets/[id]/page.tsx` (assignment UI + UniversalChat integration)
  - `components/chat/UniversalChatInterface.tsx` (add ticket mode support)
  - `lib/ticket-service.ts` (if needed for chat format conversion)

### Testing Considerations

- Test ticket creation from chat with various chat states
- Test assignment changes and permissions
- Test UniversalChat in ticket mode with various response types
- Test internal notes vs customer-visible responses
- Test email sending functionality
- Test cross-navigation between chats and tickets

---

## Dependencies

### Prerequisites

- UniversalChatInterface component exists ✓
- CreateTicketFromChatModal component exists ✓
- Ticket API endpoints exist ✓
- Chat API endpoints exist ✓

### Blocking Issues

- None identified

---

## Timeline Estimate

- **Phase 1**: 2-3 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 4-6 hours (most complex)
- **Phase 4**: 2-3 hours

**Total**: ~11-16 hours

---

## Success Metrics

1. Support agents can create tickets from chats in < 3 clicks
2. Ticket assignment can be changed in < 2 clicks
3. Ticket responses use UniversalChat interface
4. All existing ticket functionality is preserved
5. User experience is improved with consistent chat interface
