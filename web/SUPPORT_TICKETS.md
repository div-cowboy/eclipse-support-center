# Support Ticket System - Architecture & Implementation Plan

## Overview

A traditional support ticket system that complements the existing chat system, providing structured form-based support with email integration, agent assignment, priority management, and SLA tracking.

## Core Features

- **Embeddable Ticket Form** - Widget similar to chat embed for external sites
- **Ticket Management Dashboard** - Full admin interface for viewing/managing tickets
- **Email Integration** - Bidirectional email sync (console.log placeholder initially)
- **Agent Assignment** - Assign tickets to specific support agents
- **Priority & Status Management** - Priority levels and status workflow
- **Real-time Updates** - Leverage existing WebSocket infrastructure
- **File Attachments** - Support for file uploads with tickets
- **SLA Tracking** - Response and resolution time tracking
- **Multi-organization Support** - Isolated tickets per organization

---

## Architecture

### 1. Database Schema (Prisma)

```prisma
// Support Ticket Models

model Ticket {
  id                String            @id @default(cuid())
  ticketNumber      Int               @unique // Auto-incrementing friendly number
  subject           String
  description       String
  status            TicketStatus      @default(NEW)
  priority          TicketPriority    @default(MEDIUM)
  category          String?           // e.g., "Technical", "Billing", "General"

  // Relations
  organizationId    String
  organization      Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  requesterId       String?           // Customer who created the ticket
  requester         User?             @relation("TicketRequester", fields: [requesterId], references: [id])
  requesterEmail    String            // Store email even if user doesn't exist
  requesterName     String

  assignedToId      String?
  assignedTo        User?             @relation("TicketAssignee", fields: [assignedToId], references: [id])
  assignedAt        DateTime?

  // Chat Integration - Link to originating chat
  originChatId      String?           // Chat that spawned this ticket
  originChat        Chat?             @relation(fields: [originChatId], references: [id])
  linkedChatIds     String[]          @default([]) // Additional related chats

  // Metadata
  tags              String[]          @default([])
  customFields      Json?             // Flexible JSON for custom form fields
  metadata          Json?             // Source, user agent, IP, etc.

  // SLA tracking
  firstResponseAt   DateTime?
  firstResponseSla  DateTime?         // When first response is due
  resolutionSla     DateTime?         // When resolution is due
  resolvedAt        DateTime?
  closedAt          DateTime?

  // Timestamps
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Relations
  responses         TicketResponse[]
  attachments       TicketAttachment[]
  activities        TicketActivity[]

  @@index([organizationId])
  @@index([status])
  @@index([priority])
  @@index([assignedToId])
  @@index([requesterId])
  @@index([requesterEmail])
  @@index([createdAt])
  @@index([ticketNumber])
  @@index([originChatId])
}

// Update to Chat model (add to existing schema)
// Add this relation to the existing Chat model:
model Chat {
  // ... existing fields ...

  // Ticket Integration - Tickets created from this chat
  tickets           Ticket[]

  // ... rest of existing fields ...
}

model TicketResponse {
  id              String              @id @default(cuid())
  content         String
  isInternal      Boolean             @default(false) // Internal notes vs customer-visible
  isEmailSent     Boolean             @default(false)
  emailMessageId  String?             // Reference to email provider message ID

  ticketId        String
  ticket          Ticket              @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  authorId        String?
  author          User?               @relation(fields: [authorId], references: [id])
  authorEmail     String              // Store email for non-user responses
  authorName      String
  authorType      ResponseAuthorType  @default(AGENT) // CUSTOMER, AGENT, SYSTEM

  attachments     TicketAttachment[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([ticketId])
  @@index([authorId])
  @@index([createdAt])
}

model TicketAttachment {
  id              String          @id @default(cuid())
  filename        String
  originalName    String
  mimeType        String
  size            Int             // Size in bytes
  url             String          // Storage URL (S3, etc.)
  thumbnailUrl    String?         // For images

  ticketId        String?
  ticket          Ticket?         @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  responseId      String?
  response        TicketResponse? @relation(fields: [responseId], references: [id], onDelete: Cascade)

  uploadedById    String?
  uploadedBy      User?           @relation(fields: [uploadedById], references: [id])

  createdAt       DateTime        @default(now())

  @@index([ticketId])
  @@index([responseId])
  @@index([uploadedById])
}

model TicketActivity {
  id              String              @id @default(cuid())
  ticketId        String
  ticket          Ticket              @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  activityType    TicketActivityType  // CREATED, STATUS_CHANGED, ASSIGNED, etc.
  description     String              // Human-readable description
  changes         Json?               // Store before/after values

  performedById   String?
  performedBy     User?               @relation(fields: [performedById], references: [id])
  performedByName String              // Store name for audit trail

  createdAt       DateTime            @default(now())

  @@index([ticketId])
  @@index([createdAt])
}

// Enums

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_ON_CUSTOMER
  WAITING_ON_THIRD_PARTY
  RESOLVED
  CLOSED
  CANCELLED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
  CRITICAL
}

enum ResponseAuthorType {
  CUSTOMER
  AGENT
  SYSTEM
  EMAIL
}

enum TicketActivityType {
  CREATED
  STATUS_CHANGED
  PRIORITY_CHANGED
  ASSIGNED
  UNASSIGNED
  RESPONDED
  INTERNAL_NOTE_ADDED
  ATTACHMENT_ADDED
  TAG_ADDED
  TAG_REMOVED
  MERGED
  SPLIT
  REOPENED
  RESOLVED
  CLOSED
}
```

### 2. API Routes Structure

```
app/api/tickets/
├── route.ts                    # GET (list), POST (create - manual ticket)
├── [id]/
│   ├── route.ts               # GET (single), PATCH (update), DELETE
│   ├── responses/
│   │   └── route.ts           # GET (list), POST (add response)
│   ├── attachments/
│   │   └── route.ts           # POST (upload), DELETE
│   ├── assign/
│   │   └── route.ts           # POST (assign/unassign)
│   └── status/
│       └── route.ts           # PATCH (change status)
├── from-chat/
│   └── [chatId]/
│       └── route.ts           # POST (create ticket from chat - specialized)
├── stats/
│   └── route.ts               # GET (ticket statistics)
└── export/
    └── route.ts               # GET (export tickets to CSV)

app/api/embed/tickets/
├── submit/
│   └── route.ts               # POST (public ticket submission)
├── form-config/
│   └── route.ts               # GET (form configuration for embed)
└── status/
    └── route.ts               # GET (public ticket status lookup)
```

### 3. Real-time Architecture

Leverage existing WebSocket infrastructure:

```typescript
// WebSocket events for tickets
interface TicketEvents {
  'ticket:created': { ticketId: string; organizationId: string };
  'ticket:updated': { ticketId: string; changes: Partial<Ticket> };
  'ticket:response:added': { ticketId: string; responseId: string };
  'ticket:assigned': { ticketId: string; assignedToId: string };
  'ticket:status:changed': { ticketId: string; oldStatus: string; newStatus: string };
}

// Redis channels
- ticket:{organizationId}       // All tickets for org
- ticket:{ticketId}             // Specific ticket updates
- agent:{userId}                // Assigned tickets for agent
```

### 4. Embed Widget Architecture

Similar to chat embed, but for ticket submission:

```html
<!-- Embed script -->
<script
  src="https://your-domain.com/eclipse-ticket-widget.js"
  data-eclipse-tickets
  data-organization-id="org123"
  data-theme="light"
  data-position="bottom-right"
></script>
```

**Widget Features:**

- Multi-step form with validation
- File upload support
- Custom fields based on organization config
- Real-time validation
- Submission confirmation with ticket number
- Status tracking link

### 5. Email Integration Architecture

```typescript
// Email Service Interface (pluggable)
interface EmailProvider {
  sendTicketCreated(ticket: Ticket): Promise<void>;
  sendTicketResponse(ticket: Ticket, response: TicketResponse): Promise<void>;
  parseIncomingEmail(email: IncomingEmail): Promise<TicketResponse>;
  setupWebhook(organizationId: string): Promise<WebhookConfig>;
}

// Initial Implementation (Console Log)
class ConsoleEmailProvider implements EmailProvider {
  async sendTicketCreated(ticket: Ticket) {
    console.log("📧 Email would be sent:", {
      to: ticket.requesterEmail,
      subject: `Ticket #${ticket.ticketNumber} Created: ${ticket.subject}`,
      body: generateTicketEmail(ticket),
    });
  }

  async sendTicketResponse(ticket: Ticket, response: TicketResponse) {
    console.log("📧 Email would be sent:", {
      to: ticket.requesterEmail,
      subject: `Re: Ticket #${ticket.ticketNumber}`,
      body: generateResponseEmail(ticket, response),
    });
  }

  async parseIncomingEmail(email: IncomingEmail) {
    console.log("📨 Incoming email received:", email);
    // Parse and create TicketResponse
  }
}

// Future: SendGrid, Postmark, AWS SES, etc.
class SendGridEmailProvider implements EmailProvider {
  // Real implementation
}
```

### 6. File Storage Architecture

```typescript
// Storage Service Interface (pluggable)
interface StorageProvider {
  uploadFile(file: File, metadata: FileMetadata): Promise<UploadResult>;
  deleteFile(fileId: string): Promise<void>;
  getSignedUrl(fileId: string, expiresIn?: number): Promise<string>;
  generateThumbnail(fileId: string): Promise<string>;
}

// Initial: Local file system or Vercel Blob
// Future: S3, Cloudinary, etc.
```

---

## Implementation Phases

### Phase 1: Database & Core API (Week 1)

**Goal:** Set up database schema and core CRUD operations

**Tasks:**

1. Update `prisma/schema.prisma` with ticket models
   - Add Ticket, TicketResponse, TicketAttachment, TicketActivity models
   - Add `tickets` relation to Chat model
   - Add `originChatId` and `linkedChatIds` to Ticket model
2. Create and run migrations
3. Create API routes for tickets:
   - `POST /api/tickets` - Create ticket
   - `GET /api/tickets` - List tickets (with filters)
   - `GET /api/tickets/[id]` - Get single ticket
   - `PATCH /api/tickets/[id]` - Update ticket
   - `POST /api/tickets/[id]/responses` - Add response
   - `POST /api/tickets/from-chat/[chatId]` - **Create ticket from chat** ⭐
4. Implement ticket service layer (`lib/ticket-service.ts`)
   - `createTicket()`
   - `createTicketFromChat(chatId, options)` - **New method** ⭐
   - `getTicketTranscript()`
   - `linkTicketToChat()`
5. Add ticket number auto-increment logic
6. Create seed data for testing
7. Add navigation link to ui

**Deliverables:**

- Working API endpoints
- Database migrations with chat-ticket relations
- Postman/API tests
- Basic ticket CRUD functionality
- **Chat-to-ticket creation endpoint** ⭐

---

### Phase 2: Admin Dashboard UI (Week 2)

**Goal:** Build admin interface for managing tickets

**Tasks:**

1. Create ticket list page (`app/app/tickets/page.tsx`)
   - **"+ New Ticket" button** for manual ticket creation ⭐
   - Table view with filters (status, priority, assigned)
   - Search functionality
   - Sorting by date, priority, status
   - Pagination
   - **Show "Created from Chat" badge** for chat-originated tickets
2. **Create manual ticket form** (`components/tickets/CreateTicketForm.tsx`) ⭐
   - Requester information (name, email, search existing users)
   - Subject and description fields
   - Priority selector
   - Category dropdown
   - Tags input
   - Custom fields (based on organization config)
   - File attachment support
   - Auto-assign option
   - Can be used standalone or in modal
3. Create ticket detail page (`app/app/tickets/[id]/page.tsx`)
   - Ticket information panel
   - Response timeline
   - Status/priority controls
   - Assignment controls
   - Activity log
   - **"Related Chat" section with link (dummy URL for now)** (only if originChatId exists)
   - **Show full chat transcript if included**
4. Create response form component
   - Rich text editor
   - Internal notes toggle
   - Send & close button
5. Create ticket statistics dashboard
   - Open/closed counts
   - Average response time
   - SLA compliance metrics
   - Agent workload
   - **Chat-to-ticket conversion rate**
6. **Add "Create Ticket" action to UniversalChatInterface**
   - Button in chat header/actions menu
   - Opens CreateTicketFromChatModal (specialized version of form)
   - Shows success toast with ticket number
   - Displays ticket badge in chat header after creation

**Deliverables:**

- Full admin dashboard
- **Manual ticket creation form** ⭐
- **"New Ticket" button in ticket list** ⭐
- Ticket management interface
- Statistics and metrics views
- **Chat interface ticket creation button**
- **CreateTicketFromChatModal component** (pre-filled version of form)

---

### Phase 3: Public Embed Widget (Week 3)

**Goal:** Create embeddable ticket submission form

**Tasks:**

1. Create embed form page (`app/embed/tickets/page.tsx`)
   - Multi-step form (Contact Info → Issue Details → Attachments)
   - Form validation
   - Custom field support
   - Success confirmation
2. Create public API endpoint (`/api/embed/tickets/submit`)
   - Anonymous ticket creation
   - Rate limiting
   - CAPTCHA integration (optional)
3. Build JavaScript widget (`public/eclipse-ticket-widget.js`)
   - Popup form modal
   - Mobile-responsive
   - Theme customization
   - Event callbacks
4. Create widget configuration system
   - Custom fields per organization
   - Branding options
   - Form layout customization
5. Create documentation and examples

**Deliverables:**

- Working embed widget
- Public submission endpoint
- Widget documentation
- Example integrations

---

### Phase 4: Real-time Updates (Week 4)

**Goal:** Add WebSocket integration for live updates

**Tasks:**

1. Extend WebSocket server with ticket events
   - `ticket:created`
   - `ticket:updated`
   - `ticket:response:added`
   - `ticket:assigned`
   - `ticket:status:changed`
2. Create React hooks for real-time tickets
   - `useRealtimeTicket(ticketId)`
   - `useRealtimeTicketList(organizationId)`
3. Add Redis pub/sub for ticket events
4. Update UI to handle real-time events
   - Live ticket list updates
   - Live response additions
   - Notification badges
5. Add presence indicators (who's viewing ticket)

**Deliverables:**

- Real-time ticket updates
- WebSocket integration
- Live UI updates

---

### Phase 5: Email Integration Placeholder (Week 5)

**Goal:** Set up email integration architecture with console.log implementation

**Tasks:**

1. Create email service interface (`lib/email-service.ts`)
2. Implement console logger provider
   - Log outgoing emails
   - Log incoming email parsing
   - Log webhook events
3. Create email templates
   - Ticket created confirmation
   - New response notification
   - Ticket status changes
   - Assignment notifications
4. Add email settings to organization config
   - Custom reply-to address
   - Email signature
   - Auto-response templates
5. Create webhook endpoint for future email provider
   - `/api/tickets/webhook/email`
   - Parse incoming emails
   - Match to existing tickets (by ticket number in subject)
   - Create new responses

**Deliverables:**

- Email service architecture
- Console log implementation
- Email templates
- Webhook endpoint (ready for provider)

---

### Phase 6: File Attachments (Week 6)

**Goal:** Add file upload support to tickets and responses

**Tasks:**

1. Set up file storage (Vercel Blob or S3)
2. Create upload API endpoint
   - `/api/tickets/[id]/attachments`
   - File validation (size, type)
   - Virus scanning (optional)
   - Thumbnail generation for images
3. Add file upload UI component
   - Drag & drop
   - Multiple files
   - Progress indicator
   - Preview thumbnails
4. Add attachment display in ticket view
   - File list
   - Download links
   - Image previews
5. Add attachment cleanup job
   - Delete files when ticket deleted
   - Archive old attachments

**Deliverables:**

- File upload functionality
- Attachment management
- Storage integration

---

### Phase 7: Advanced Features (Week 7-8)

**Goal:** Add SLA tracking, automation, and advanced features

**Tasks:**

1. **SLA Management**
   - Configure SLA rules per organization
   - First response SLA
   - Resolution SLA
   - Auto-escalation on SLA breach
   - SLA countdown timers in UI
2. **Automation Rules**
   - Auto-assignment based on category
   - Auto-tagging based on keywords
   - Auto-response for common issues
   - Scheduled ticket closure
3. **Analytics & Reporting**
   - Ticket volume trends
   - Response time analytics
   - Agent performance metrics
   - Customer satisfaction tracking
   - Export reports (CSV, PDF)
4. **Ticket Merging & Splitting**
   - Merge duplicate tickets
   - Split multi-issue tickets
   - Link related tickets
5. **Canned Responses**
   - Template library
   - Quick reply shortcuts
   - Variable substitution
6. **Customer Portal**
   - Customer login to view their tickets
   - Ticket history
   - Self-service status updates

**Deliverables:**

- SLA tracking system
- Automation rules engine
- Advanced analytics
- Customer portal

---

## Integration Points with Existing System

### 1. Ticket Creation Flows

The support ticket system supports **three primary creation methods**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TICKET CREATION FLOWS                             │
└─────────────────────────────────────────────────────────────────────┘

  1. MANUAL (Admin UI)         2. FROM CHAT             3. PUBLIC EMBED
  ┌──────────────┐            ┌──────────────┐         ┌──────────────┐
  │ Ticket List  │            │ Chat View    │         │ External     │
  │  + New       │            │ [Create      │         │ Website      │
  │   Ticket     │            │  Ticket]     │         │ <widget>     │
  └──────┬───────┘            └──────┬───────┘         └──────┬───────┘
         │                           │                        │
         ▼                           ▼                        ▼
  ┌──────────────┐            ┌──────────────┐         ┌──────────────┐
  │ Full Form    │            │ Pre-filled   │         │ Multi-step   │
  │ - Requester  │            │ - Chat title │         │ - Contact    │
  │ - Subject    │            │ - Transcript │         │ - Issue      │
  │ - Details    │            │ - Customer   │         │ - Submit     │
  │ - Priority   │            │ - Priority   │         │              │
  └──────┬───────┘            └──────┬───────┘         └──────┬───────┘
         │                           │                        │
         └─────────────┬─────────────┴────────────────────────┘
                       ▼
                ┌──────────────┐
                │ POST /api/   │
                │ tickets      │
                └──────┬───────┘
                       ▼
                ┌──────────────┐
                │ New Ticket   │
                │ Created      │
                └──────────────┘
```

#### A. Manual Ticket Creation (Admin UI)

**Use cases:**

- Agent creates ticket on behalf of customer (phone call, in-person)
- Internal tickets for bugs, tasks, feature requests
- Tickets from other channels (email, social media, etc.)
- Proactive outreach tickets

**Entry points:**

- "New Ticket" button on ticket list page
- Direct link to `/app/tickets/new`
- Quick action from dashboard

**Features:**

- Full form with all fields
- Requester search/autocomplete
- Rich text editor for description
- File attachments
- Custom fields
- Save draft capability

#### B. Chat-to-Ticket Creation ⭐ NEW

**Use cases:**

- Escalate complex chat issues to formal ticket
- Create ticket record for chat that needs follow-up
- Transfer chat conversation to email-based support
- Document chat conversation for later reference

**Entry points:**

- "Create Ticket" button in chat header (UniversalChatInterface)
- Action menu in chat detail view
- Bulk action from chat list (future)

**Features:**

- Pre-filled with chat context (auto-populated)
- Full chat transcript included in description
- Requester info from chat automatically extracted
- Priority suggested based on escalation status
- One-click creation with smart defaults
- Links chat ↔ ticket bidirectionally

#### C. Public Embed Widget Creation

**Use cases:**

- Customer self-service ticket submission
- External website ticket forms
- Public support request forms
- Anonymous or logged-in submissions

**Entry points:**

- Embedded widget on external websites
- Public facing support form
- Customer portal (future)

**Features:**

- Simple multi-step form
- CAPTCHA for spam prevention
- File upload support
- Custom fields per organization
- Submission confirmation with tracking number

---

### 2. Chat-to-Ticket Integration ⭐ NEW

**Seamless ticket creation from Universal Chat Interface**

#### Database Relationship

```prisma
Ticket:
  - originChatId (optional link to source chat)
  - linkedChatIds (array of related chats)

Chat:
  - tickets[] (reverse relation)
```

#### Agent Actions in Chat Interface

**Create Ticket Button** - Add to chat header/actions menu:

- Button: "Create Ticket" or "Escalate to Ticket"
- Opens modal with pre-filled ticket form
- Auto-populates:
  - Subject: Chat title
  - Description: Full chat transcript
  - Requester: Customer from chat
  - Priority: Based on escalation status
  - Category: Suggest based on chat content

**Quick Ticket Creation Flow:**

```typescript
// In UniversalChatInterface.tsx - Add action button
<Button
  onClick={() => createTicketFromChat(chat.id)}
  variant="outline"
  icon={<TicketIcon />}
>
  Create Ticket
</Button>

// API call
POST /api/tickets/from-chat/{chatId}
{
  "subject": "Optional override",
  "priority": "HIGH",
  "category": "Technical",
  "includeTranscript": true,  // Include full chat history
  "includeAttachments": true, // Copy chat attachments to ticket
  "autoAssignToAgent": true   // Assign to current agent
}

Response:
{
  "ticket": {
    "id": "ticket_123",
    "ticketNumber": 1001,
    "originChatId": "chat_456",
    "viewUrl": "/app/tickets/ticket_123"  // Dummy link for now
  }
}
```

#### UI Components Needed

**1. Manual Ticket Creation Form** (`components/tickets/CreateTicketForm.tsx`)

```tsx
interface CreateTicketFormProps {
  organizationId: string;
  onSuccess?: (ticket: Ticket) => void;
  onCancel?: () => void;
  defaultValues?: {
    subject?: string;
    description?: string;
    priority?: TicketPriority;
    category?: string;
    requesterName?: string;
    requesterEmail?: string;
    tags?: string[];
  };
  mode?: 'modal' | 'page'; // Display mode
}

// Features:
- Requester search/autocomplete (find existing users)
- Manual requester entry (name + email)
- Subject and description fields (rich text editor)
- Priority selector (Low, Medium, High, Urgent, Critical)
- Category dropdown (from org config)
- Tags input (multi-select or free-form)
- Custom fields (dynamic based on org settings)
- File attachments (drag & drop, multiple files)
- Auto-assign to me checkbox
- Save draft capability
- Validation and error handling
- Can be used standalone (full page) or in modal
```

**Example Usage - Standalone Page:**

```tsx
// app/app/tickets/new/page.tsx
<CreateTicketForm
  organizationId={session.user.organizationId}
  mode="page"
  onSuccess={(ticket) => router.push(`/app/tickets/${ticket.id}`)}
  onCancel={() => router.back()}
/>
```

**Example Usage - Modal from Ticket List:**

```tsx
// app/app/tickets/page.tsx
<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Ticket</DialogTitle>
    </DialogHeader>
    <CreateTicketForm
      organizationId={organizationId}
      mode="modal"
      onSuccess={(ticket) => {
        toast.success(`Ticket #${ticket.ticketNumber} created`);
        setIsModalOpen(false);
        refreshTickets();
      }}
      onCancel={() => setIsModalOpen(false)}
    />
  </DialogContent>
</Dialog>
```

**2. Chat-to-Ticket Modal** (`components/tickets/CreateTicketFromChatModal.tsx`)

```tsx
interface CreateTicketFromChatModalProps {
  chatId: string;
  chatTitle: string;
  customerName: string;
  customerEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticket: Ticket) => void;
}

// Features:
- Wraps CreateTicketForm with chat-specific defaults
- Pre-fills subject from chat title
- Pre-fills description with chat transcript
- Pre-fills requester from chat customer
- Suggests priority based on escalation status
- Toggle "Include full transcript"
- Toggle "Include attachments"
- Auto-assign checkbox
- Preview transcript before submitting

// Implementation:
// This component fetches chat data and passes it to CreateTicketForm as defaultValues
```

**3. Ticket Link Badge in Chat** (After ticket created)

```tsx
// Shows linked ticket in chat header
<Badge variant="secondary">
  <TicketIcon className="w-3 h-3" />
  Ticket #{ticket.ticketNumber}
  <Link href="/app/tickets/{ticket.id}">View</Link>
</Badge>
```

**4. Chat Reference in Ticket View**

```tsx
// Shows originating chat in ticket detail page
<Card>
  <CardHeader>
    <CardTitle>Related Chat</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-2">
      <MessageSquare className="w-4 h-4" />
      <span>{chat.title}</span>
      <Link href={`/app/chats/${chat.id}`}>View Chat</Link>
    </div>
  </CardContent>
</Card>
```

#### Transcript Formatting

When creating ticket from chat, format conversation history:

```typescript
function formatChatTranscript(messages: Message[]): string {
  return messages
    .map((msg) => {
      const timestamp = format(msg.createdAt, "MMM dd, yyyy HH:mm");
      const role =
        msg.role === "USER"
          ? "Customer"
          : msg.role === "AGENT"
          ? "Agent"
          : "Bot";
      return `[${timestamp}] ${role}: ${msg.content}`;
    })
    .join("\n\n");
}

// Stored in ticket.description or ticket.metadata.transcript
```

#### Benefits of Chat-to-Ticket Flow

1. **No Re-typing** - Agent doesn't need to manually copy info
2. **Full Context** - Complete conversation history preserved
3. **Seamless Handoff** - Continue conversation in ticket system
4. **Tracking** - Link between chat and ticket maintained
5. **Email Thread** - Customer gets ticket email continuation
6. **Analytics** - Track chat → ticket escalation rates

### 3. User Management

- Leverage existing `User` model
- Add ticket-related permissions (requester, agent, admin)
- Agent role assignment and workload tracking
- User search/autocomplete in ticket forms

### 4. Organization Management

- Tickets scoped to organizations
- Organization-specific settings (categories, custom fields, SLA rules)
- Custom branding per org
- Per-organization ticket numbering (optional)

### 5. WebSocket Infrastructure

- Use existing WS server in `ws-server/`
- Extend with ticket event handlers
- Leverage Redis pub/sub for real-time updates
- Live ticket list updates for agents
- Real-time response notifications

### 6. Embed System

- Similar pattern to chat embed
- Reuse CORS configuration
- Share styling system
- Consistent widget API

### 7. Authentication

- NextAuth integration for admin/agent access
- Public endpoints for embed widget (no auth)
- Session-based ticket tracking
- API key auth for external integrations (future)

---

## Technical Considerations

### Security

- Rate limiting on public endpoints
- CAPTCHA for spam prevention
- File upload validation and sanitization
- XSS protection in ticket content
- CSRF protection

### Performance

- Ticket list pagination
- Database indexes on common queries
- Caching for ticket statistics
- Lazy loading for attachments
- CDN for embed widget

### Scalability

- Stateless API design
- Horizontal scaling ready
- Background jobs for email sending
- Queue system for heavy operations (file processing)

### Monitoring

- Error tracking (Sentry)
- Performance monitoring
- Email delivery tracking
- SLA breach alerts
- Usage analytics

---

## Data Model Relationships

```
Organization
├── Tickets (many)
│   ├── Requester (User, optional)
│   ├── Assigned Agent (User, optional)
│   ├── Responses (many)
│   │   ├── Author (User, optional)
│   │   └── Attachments (many)
│   ├── Attachments (many)
│   │   └── Uploaded By (User, optional)
│   └── Activities (many)
│       └── Performed By (User, optional)
└── Users (many)
    ├── Requested Tickets (many)
    ├── Assigned Tickets (many)
    └── Responses (many)
```

---

## API Examples

### Create Ticket Manually (Admin)

```bash
POST /api/tickets
Authorization: Bearer <token>
Content-Type: application/json

{
  "organizationId": "org123",
  "requesterName": "John Doe",
  "requesterEmail": "john@example.com",
  "requesterId": "user_abc123",  // Optional if user exists
  "subject": "Cannot access billing dashboard",
  "description": "Customer called and reported they can't access the billing section...",
  "priority": "HIGH",
  "category": "Technical",
  "tags": ["billing", "access-issue"],
  "customFields": {
    "source": "phone",
    "accountNumber": "12345"
  },
  "assignedToId": "agent_xyz789",  // Optional
  "originChatId": null  // No chat origin for manual tickets
}

Response:
{
  "success": true,
  "ticket": {
    "id": "ticket_abc123",
    "ticketNumber": 1001,
    "subject": "Cannot access billing dashboard",
    "status": "NEW",
    "priority": "HIGH",
    "assignedToId": "agent_xyz789",
    "viewUrl": "/app/tickets/ticket_abc123"
  }
}
```

### Create Ticket from Chat (Agent)

```bash
POST /api/tickets/from-chat/chat_456
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Login issue - requires investigation",  // Optional override
  "priority": "HIGH",
  "category": "Technical",
  "includeTranscript": true,
  "includeAttachments": true,
  "autoAssignToAgent": true,
  "tags": ["escalated-from-chat"]
}

Response:
{
  "success": true,
  "ticket": {
    "id": "ticket_def456",
    "ticketNumber": 1002,
    "subject": "Login issue - requires investigation",
    "status": "NEW",
    "priority": "HIGH",
    "originChatId": "chat_456",
    "requesterName": "Jane Smith",
    "requesterEmail": "jane@example.com",
    "description": "[Chat Transcript]\n[Nov 02, 2025 10:30] Customer: I can't login...",
    "viewUrl": "/app/tickets/ticket_def456"
  }
}
```

### Create Ticket (Public Embed)

```bash
POST /api/embed/tickets/submit
Content-Type: application/json

{
  "organizationId": "org123",
  "requesterName": "John Doe",
  "requesterEmail": "john@example.com",
  "subject": "Cannot login to my account",
  "description": "I keep getting 'invalid credentials' error...",
  "priority": "MEDIUM",
  "category": "Technical",
  "customFields": {
    "accountNumber": "12345",
    "productVersion": "2.1.0"
  }
}

Response:
{
  "success": true,
  "ticket": {
    "id": "ticket_abc123",
    "ticketNumber": 1001,
    "subject": "Cannot login to my account",
    "status": "NEW",
    "trackingUrl": "https://support.example.com/track/1001-abc123"
  }
}
```

### Add Response (Agent)

```bash
POST /api/tickets/ticket_abc123/responses
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hi John, I've reset your password. Please check your email.",
  "isInternal": false,
  "statusChange": "IN_PROGRESS"
}

Response:
{
  "success": true,
  "response": {
    "id": "resp_xyz789",
    "content": "Hi John, I've reset your password...",
    "author": {
      "name": "Support Agent",
      "email": "agent@example.com"
    },
    "createdAt": "2025-11-02T10:30:00Z"
  },
  "ticket": {
    "status": "IN_PROGRESS",
    "firstResponseAt": "2025-11-02T10:30:00Z"
  }
}
```

---

## Configuration Schema

```typescript
// Organization ticket settings
interface TicketSettings {
  enabled: boolean;
  embedConfig: {
    allowAnonymous: boolean;
    requireEmail: boolean;
    requirePhone: boolean;
    customFields: CustomField[];
    categories: string[];
    defaultPriority: TicketPriority;
    confirmationMessage: string;
  };
  slaConfig: {
    firstResponseTime: number; // minutes
    resolutionTime: {
      low: number;
      medium: number;
      high: number;
      urgent: number;
      critical: number;
    };
    businessHours: BusinessHours;
  };
  emailConfig: {
    provider: "console" | "sendgrid" | "postmark" | "ses";
    fromEmail: string;
    fromName: string;
    replyToEmail: string;
    signature: string;
    templates: EmailTemplates;
  };
  automationRules: AutomationRule[];
  assignmentRules: AssignmentRule[];
}
```

---

## Testing Strategy

### Unit Tests

- Ticket service functions
- Email template generation
- SLA calculation logic
- File upload validation

### Integration Tests

- API endpoint functionality
- Database operations
- WebSocket events
- Email sending (mocked)

### E2E Tests

- Ticket creation flow
- Response workflow
- Status changes
- Assignment process
- Embed widget submission

---

## Documentation Deliverables

1. **API Documentation** - OpenAPI/Swagger spec
2. **Embed Widget Guide** - Integration instructions
3. **Admin User Guide** - How to manage tickets
4. **Email Integration Guide** - Provider setup instructions
5. **Developer Guide** - Architecture and customization

---

## Future Enhancements (Post-Launch)

- **Multi-channel support** - WhatsApp, SMS, social media
- **AI-powered suggestions** - Auto-categorization, suggested responses
- **Chatbot integration** - Convert chat to ticket
- **Video calls** - Scheduled video support sessions
- **Knowledge base integration** - Suggest articles during ticket creation
- **Customer satisfaction surveys** - CSAT, NPS tracking
- **Mobile apps** - iOS/Android for agents
- **Ticket templates** - Pre-filled forms for common issues
- **Time tracking** - Track agent time spent on tickets
- **Billing integration** - Billable support hours

---

## Success Metrics

- **Ticket Resolution Rate** - % of tickets resolved within SLA
- **First Response Time** - Average time to first agent response
- **Resolution Time** - Average time to ticket resolution
- **Customer Satisfaction** - CSAT score from surveys
- **Agent Productivity** - Tickets handled per agent
- **Ticket Volume Trends** - Daily/weekly ticket creation rate
- **Abandonment Rate** - % of embed forms started but not submitted

---

## Estimated Timeline

- **Phase 1 (Database & API):** 1 week
- **Phase 2 (Admin Dashboard):** 1 week
- **Phase 3 (Embed Widget):** 1 week
- **Phase 4 (Real-time):** 1 week
- **Phase 5 (Email Placeholder):** 1 week
- **Phase 6 (Attachments):** 1 week
- **Phase 7 (Advanced Features):** 2 weeks

**Total:** 8 weeks for full implementation

**MVP (Phases 1-3):** 3 weeks
**Production-ready (Phases 1-6):** 6 weeks

---

## Conclusion

This support ticket system is designed to:

1. Complement the existing chat system
2. Provide structured, trackable support
3. Integrate seamlessly with current architecture
4. Scale from MVP to enterprise-ready
5. Support multiple channels (embed, email, portal)

The phased approach allows for incremental development and testing, with each phase delivering tangible value. The architecture is flexible enough to accommodate future enhancements and integrations.
