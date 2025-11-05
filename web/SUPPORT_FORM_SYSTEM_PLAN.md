# Support Form System - Implementation Plan

## Overview

A customizable embeddable support form system that allows organizations to create custom ticket submission forms, embed them via iframe, and submit tickets directly to the support ticket system. Designed for performance and cost efficiency with lifetime data considerations.

## Architecture Overview

```
Form Builder (Admin) → Form Configuration (DB) → Embed Form (Iframe) → Ticket API → Support Tickets
```

## Phase 1: Database Schema & Core Models

### 1.1 SupportForm Model

**Design Philosophy**: Store form configuration as JSON to minimize database overhead and enable flexible customization without schema changes.

```prisma
model SupportForm {
  id             String   @id @default(cuid())
  name           String   // User-friendly name
  description    String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Form Configuration (stored as JSON for flexibility)
  fields         Json     // Array of field definitions
  settings       Json     // Form settings (theme, validation, redirects, etc.)
  defaultValues  Json?    // Default values for auto-populated fields

  // Status & Metadata
  status         SupportFormStatus @default(ACTIVE)
  isPublic       Boolean  @default(true) // Can be accessed via public URL
  embedCode      String   @unique // Short code for embedding (e.g., "abc123")

  // Assignment & Routing
  defaultCategory String?  // Default category for tickets from this form
  defaultPriority TicketPriority? // Default priority
  autoAssignToId  String?  // Auto-assign tickets to specific agent
  tags            String[] @default([]) // Auto-tag tickets from this form

  // Analytics
  submissionCount Int      @default(0) // Track submissions (for analytics)
  lastSubmittedAt DateTime?

  // Timestamps
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  createdById    String
  createdBy      User      @relation("FormCreator", fields: [createdById], references: [id])

  @@index([organizationId])
  @@index([embedCode])
  @@index([status])
  @@index([isPublic])
}

enum SupportFormStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

### 1.2 Field Configuration Schema (JSON)

```typescript
interface FormField {
  id: string; // Unique field ID
  type:
    | "text"
    | "email"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "file"
    | "number"
    | "date";
  label: string;
  name: string; // Field name for form submission
  placeholder?: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string; // Regex pattern
    min?: number;
    max?: number;
  };
  options?: Array<{ label: string; value: string }>; // For select, radio, checkbox
  defaultValue?: string | number | boolean;
  helpText?: string;
  order: number; // Display order
}

interface FormSettings {
  theme?: {
    primaryColor?: string;
    borderRadius?: string;
    fontFamily?: string;
  };
  submitButton?: {
    text: string;
    color?: string;
  };
  successMessage?: string;
  redirectUrl?: string; // Redirect after successful submission
  showBranding?: boolean;
  requireEmail?: boolean; // Always require email field
  requireName?: boolean; // Always require name field
  spamProtection?: boolean; // Enable basic spam protection
}
```

### 1.3 Performance Considerations

- **Indexes**: Strategic indexes on `organizationId`, `embedCode`, `status`, `isPublic` for fast lookups
- **JSON Storage**: Store form config as JSON (PostgreSQL JSONB) - efficient querying and flexibility
- **Embed Code**: Short unique codes (e.g., 6-8 chars) for URL-friendly embedding
- **Counter Field**: `submissionCount` as integer for quick analytics (no COUNT queries needed)
- **No Separate Tables**: Avoid separate table per field type - all in JSON config

## Phase 2: Form Builder UI

### 2.1 Navigation & Routing

**New Navigation Item**: "Support Forms" (between "Support Tickets" and "Chatbots")

```
/app/forms          → List all forms
/app/forms/new       → Create new form
/app/forms/[id]      → View form details & analytics
/app/forms/[id]/edit → Edit form builder
```

### 2.2 Form Builder Components

**Location**: `components/forms/`

1. **FormBuilder.tsx** - Main drag-and-drop form builder

   - Drag-and-drop field ordering
   - Field type selector
   - Field configuration panel
   - Live preview
   - Form settings panel

2. **FormFieldEditor.tsx** - Individual field editor

   - Field type selection
   - Label, placeholder, validation
   - Required toggle
   - Options for select/radio/checkbox

3. **FormSettingsPanel.tsx** - Form-level settings

   - Theme customization
   - Submit button text
   - Success message
   - Redirect URL
   - Default category/priority/tags

4. **FormPreview.tsx** - Live preview of form

   - Real-time preview as fields are added/edited
   - Mobile/desktop view toggle

5. **FormList.tsx** - List of all forms

   - Status badges
   - Submission counts
   - Quick actions (view, edit, copy embed code, archive)
   - Search/filter

6. **FormAnalytics.tsx** - Form analytics dashboard
   - Submission count
   - Last submitted date
   - Submission trends (future: charts)

### 2.3 Form Builder Pages

**Location**: `app/app/forms/`

1. **page.tsx** - Forms list page

   - Grid/list view of forms
   - Create new form button
   - Filter by status
   - Search functionality

2. **new/page.tsx** - New form creation

   - Form builder with empty state
   - Step-by-step wizard (optional)

3. **[id]/page.tsx** - Form details

   - Form preview
   - Analytics
   - Embed code display
   - Edit button
   - Archive/delete actions

4. **[id]/edit/page.tsx** - Form editor
   - Full form builder interface
   - Save/cancel actions
   - Preview toggle

### 2.4 API Routes for Forms

**Location**: `app/api/forms/`

1. **route.ts** - List/Create forms

   - `GET /api/forms?organizationId=xxx` - List forms
   - `POST /api/forms` - Create new form

2. **[id]/route.ts** - Get/Update/Delete form

   - `GET /api/forms/[id]` - Get form details
   - `PUT /api/forms/[id]` - Update form
   - `DELETE /api/forms/[id]` - Archive form

3. **[id]/embed/route.ts** - Get embed code/config

   - `GET /api/forms/[id]/embed` - Get embed configuration

4. **[embedCode]/submit/route.ts** - Submit ticket from form
   - `POST /api/forms/[embedCode]/submit` - Public endpoint to submit ticket
   - No authentication required (public form)
   - Validates form data against form configuration
   - Creates ticket via ticket-service
   - Returns success/error response

## Phase 3: Embeddable Form Iframe

### 3.1 Embed Form Page

**Location**: `app/embed/form/page.tsx`

Similar structure to `app/embed/chat/page.tsx` but for forms:

- Accepts `formId` or `embedCode` as query param
- Loads form configuration from API
- Renders form dynamically based on configuration
- Handles form submission
- Shows success/error states
- Supports theming from form settings

### 3.2 Form Components

**Location**: `components/forms/embed/`

1. **EmbedForm.tsx** - Main embed form component

   - Dynamically renders fields based on form config
   - Handles validation
   - Submission logic
   - Loading states
   - Success/error messaging

2. **FormFieldRenderer.tsx** - Renders individual field types

   - Text, email, textarea, select, checkbox, radio, file, number, date
   - Applies validation rules
   - Handles field state

3. **FormSubmission.tsx** - Submission handler
   - Collects form data
   - Validates against form config
   - Submits to API
   - Handles responses

### 3.3 Embed Code Generation

**Format**: `<iframe src="https://domain.com/embed/form?code=abc123" width="100%" height="600"></iframe>`

**Alternative**: JavaScript widget (future phase, similar to chat widget)

### 3.4 Styling & Theming

- Apply theme from form settings (primaryColor, borderRadius, fontFamily)
- Support light/dark mode (auto-detect or explicit)
- Responsive design (mobile-friendly)
- CSS isolation (scoped styles to prevent conflicts)

## Phase 4: Form Service & Integration

### 4.1 Form Service

**Location**: `lib/form-service.ts`

```typescript
// Form CRUD operations
export async function createForm(input: CreateFormInput): Promise<SupportForm>;
export async function getForm(formId: string): Promise<SupportForm | null>;
export async function getFormByEmbedCode(
  embedCode: string
): Promise<SupportForm | null>;
export async function updateForm(
  formId: string,
  input: UpdateFormInput
): Promise<SupportForm>;
export async function listForms(
  organizationId: string,
  filters?: FormFilters
): Promise<SupportForm[]>;
export async function archiveForm(formId: string): Promise<SupportForm>;

// Form submission
export async function submitFormSubmission(
  embedCode: string,
  formData: Record<string, any>
): Promise<Ticket>;

// Form validation
export function validateFormSubmission(
  formConfig: SupportForm,
  formData: Record<string, any>
): ValidationResult;
```

### 4.2 Ticket Integration

**Modify**: `lib/ticket-service.ts`

- Add `createTicketFromForm` function
- Extract email/name from form data
- Map form fields to ticket fields
- Store form submission data in `customFields`
- Apply form defaults (category, priority, tags, assignment)

### 4.3 Spam Protection & Security

**Critical Security Considerations**:

This section outlines comprehensive security measures to protect form endpoints from bot spam, abuse, and malicious attacks. Since forms may be productized in the future, we need production-ready security from the start.

#### Rate Limiting (Multi-Layer)

**Implementation**: `lib/rate-limit.ts` or use middleware

1. **Per IP Address** (Primary layer)

   - Limit: 5 submissions per 15 minutes per IP
   - Limit: 20 submissions per hour per IP
   - Limit: 100 submissions per day per IP
   - Use Redis for distributed rate limiting (critical for production)
   - Fallback to in-memory cache for development

2. **Per Form Embed Code** (Secondary layer)

   - Limit: 10 submissions per minute per form
   - Limit: 50 submissions per hour per form
   - Prevents single form abuse

3. **Per Organization** (Tertiary layer)

   - Limit: 1000 submissions per day per organization
   - Prevents account-level abuse

4. **Global Rate Limit** (System-level)
   - Limit: 10,000 submissions per hour globally
   - Emergency circuit breaker

**Rate Limit Storage**:

- **Development**: In-memory cache (Map/TTL)
- **Production**: Redis with TTL keys
- **Format**: `rate_limit:form:${embedCode}:${ip}:${timeWindow}`

**Rate Limit Response**:

```typescript
{
  error: "Rate limit exceeded",
  retryAfter: 3600, // seconds
  limit: 5,
  remaining: 0,
  resetAt: "2024-01-01T12:00:00Z"
}
```

#### Honeypot Fields (Bot Detection)

**Implementation**: Hidden fields that bots fill but humans don't see

1. **Timestamp Honeypot**

   - Hidden field: `_form_timestamp` (filled by JavaScript)
   - If filled too quickly (< 3 seconds) = likely bot
   - If not filled = likely bot (no JS execution)

2. **Field Name Honeypot**

   - Hidden field: `website` or `url` (common bot targets)
   - If filled = likely bot
   - CSS: `display: none` or `position: absolute; left: -9999px`

3. **Honeypot Validation**
   - Check on submission: if honeypot filled, reject silently (don't reveal detection)
   - Log honeypot triggers for analytics
   - Optionally: increase rate limit penalty for honeypot triggers

#### Time-Based Validation

**Implementation**: Track form load time vs submission time

1. **Minimum Time to Submit**

   - Require minimum 3 seconds between page load and submission
   - Too fast = likely bot
   - Store `_form_load_time` in hidden field or localStorage

2. **Maximum Time to Submit**

   - Optional: Require submission within 30 minutes (prevents stale submissions)
   - Prevents replay attacks with old tokens

3. **Form Interaction Tracking**
   - Track mouse movements, keyboard events (optional, privacy-conscious)
   - Require at least one interaction before submission
   - Future: Behavioral analysis

#### CSRF Protection

**Implementation**: Token-based CSRF protection

1. **CSRF Token**

   - Generate unique token per form load
   - Store in hidden field: `_csrf_token`
   - Validate on submission
   - Token expires after 30 minutes

2. **Origin Validation**

   - Check `Origin` header matches expected domain
   - Check `Referer` header (if available)
   - Reject requests from unexpected origins

3. **SameSite Cookies**
   - Use `SameSite=Strict` for form session cookies
   - Prevents cross-site request forgery

#### Input Validation & Sanitization

**Server-Side Validation** (Never trust client):

1. **Field Type Validation**

   - Validate field types match form configuration
   - Reject unexpected field types
   - Validate field names against allowed list

2. **Length Validation**

   - Enforce min/max length per field
   - Global maximum: 10MB per submission (including files)
   - Text fields: max 10,000 characters
   - Email: max 254 characters (RFC 5321)

3. **Content Sanitization**

   - Sanitize HTML content (prevent XSS)
   - Strip dangerous characters
   - Validate email format (RFC 5322)
   - Validate URLs (if URL fields exist)

4. **Field Name Validation**
   - Only allow alphanumeric, underscore, hyphen
   - Reject fields starting with `_` (except system fields)
   - Whitelist allowed field names

#### Bot Detection Techniques

1. **Browser Fingerprinting** (Optional, privacy-conscious)

   - Check User-Agent is valid browser
   - Check for JavaScript execution (bots often don't execute JS)
   - Check for common bot patterns in User-Agent

2. **JavaScript Challenge**

   - Require JavaScript for form submission
   - Bots often submit without JS execution
   - Check for JS-set hidden fields

3. **Behavioral Analysis** (Future)
   - Track mouse movements, scroll behavior
   - Analyze typing patterns
   - Detect human-like vs bot-like behavior

#### IP Reputation & Blocking

1. **IP Blocklist**

   - Maintain list of known bad IPs
   - Check against IP reputation services (optional)
   - Block VPN/proxy IPs if needed (configurable)

2. **IP Allowlist** (Optional)

   - Allowlist trusted IPs for bypassing rate limits
   - Useful for internal testing

3. **Geo-Blocking** (Optional)
   - Block specific countries/regions
   - Configurable per organization

#### Email Validation

1. **Format Validation**

   - RFC 5322 compliant email validation
   - Reject invalid formats

2. **Disposable Email Detection**

   - Check against disposable email service list
   - Reject disposable emails (configurable)
   - Maintain list of known disposable email providers

3. **Domain Validation** (Optional)

   - Check email domain exists (MX record lookup)
   - Reject invalid domains (can be slow, make optional)

4. **Email Rate Limiting**
   - Limit: 3 submissions per email per day
   - Prevents email-based spam

#### File Upload Security

1. **File Type Validation**

   - Whitelist allowed MIME types
   - Reject executable files (.exe, .sh, .bat, etc.)
   - Scan file headers (not just extension)

2. **File Size Limits**

   - Maximum: 10MB per file
   - Maximum: 50MB total per submission
   - Configurable per form

3. **File Content Scanning** (Future)

   - Virus scanning for uploaded files
   - Malware detection
   - Content validation

4. **File Storage**
   - Store in isolated storage (S3, etc.)
   - Don't execute uploaded files
   - Generate unique filenames (prevent overwrites)

#### CAPTCHA Integration

**Options** (choose based on privacy requirements):

1. **Cloudflare Turnstile** (Recommended - Privacy-friendly)

   - Privacy-focused, no tracking
   - Free tier available
   - Easy integration
   - Better UX than traditional CAPTCHA

2. **Google reCAPTCHA v3** (Alternative)

   - Invisible, score-based
   - Privacy concerns (Google tracking)
   - Free tier available

3. **hCaptcha** (Alternative)

   - Privacy-focused alternative to reCAPTCHA
   - Free tier available

4. **Custom CAPTCHA** (Future)
   - Simple math problems
   - Image selection challenges
   - Custom implementation

**Implementation Strategy**:

- **Phase 1**: Basic rate limiting + honeypot (no CAPTCHA)
- **Phase 2**: Add CAPTCHA for high-risk scenarios (configurable per form)
- **Phase 3**: Advanced bot detection if needed

#### Authentication & Authorization

**Admin Endpoints** (Form Management):

1. **Authentication Required**

   - All `/api/forms/*` endpoints require session
   - Verify user is organization member
   - Verify user has permissions

2. **Public Endpoint** (Form Submission Only):

   - `/api/forms/[embedCode]/submit` - Only public endpoint
   - No authentication required
   - Heavy rate limiting + spam protection
   - Rate limit penalties for spam attempts

3. **Form Access Control**:
   - Verify form exists and is active
   - Verify form is public (if `isPublic: false`, require auth)
   - Verify form belongs to organization (if org-scoped)

#### Request Metadata & Logging

1. **Request Headers**

   - Log User-Agent, Origin, Referer
   - Log IP address (hash for privacy)
   - Log request timestamp

2. **Submission Metadata**

   - Store in ticket `metadata` field:
     - IP address (hashed)
     - User-Agent
     - Origin
     - Submission time
     - Form load time
     - Honeypot triggers
     - Rate limit status

3. **Security Event Logging**
   - Log all rate limit violations
   - Log honeypot triggers
   - Log suspicious patterns
   - Alert on high-volume abuse

#### Security Headers

**Response Headers**:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

#### Security Configuration (Per Form)

**Form Settings** (Security options):

```typescript
interface FormSecuritySettings {
  rateLimitEnabled: boolean;
  rateLimitPerIP: number; // submissions per hour
  honeypotEnabled: boolean;
  captchaEnabled: boolean;
  captchaType: "turnstile" | "recaptcha" | "hcaptcha" | "none";
  minSubmissionTime: number; // seconds
  requireEmail: boolean;
  requireName: boolean;
  blockDisposableEmails: boolean;
  allowedFileTypes?: string[]; // MIME types
  maxFileSize: number; // bytes
}
```

#### Implementation Priority

**Phase 1 (MVP - Essential)**:

- [x] Rate limiting (per IP, per form)
- [x] Honeypot fields (timestamp + field name)
- [x] Time-based validation (min 3 seconds)
- [x] Input validation & sanitization
- [x] CSRF protection
- [x] Origin validation
- [x] Email format validation

**Phase 2 (Production-Ready)**:

- [ ] Redis-based rate limiting (distributed)
- [ ] Disposable email detection
- [ ] IP blocklist
- [ ] Enhanced logging
- [ ] Security event monitoring
- [ ] File upload security

**Phase 3 (Advanced)**:

- [ ] CAPTCHA integration (configurable per form)
- [ ] Behavioral analysis
- [ ] IP reputation services
- [ ] Advanced bot detection
- [ ] Email domain validation (MX lookup)

#### Security Best Practices

1. **Defense in Depth**: Multiple layers of protection
2. **Fail Secure**: Default to blocking suspicious requests
3. **Privacy**: Hash IPs, minimize data collection
4. **Monitoring**: Log all security events
5. **Updates**: Keep dependencies updated
6. **Testing**: Regular security audits and penetration testing

#### Cost Considerations

**Security Measures Impact on Cost**:

- **Rate Limiting**: Redis costs (minimal, ~$5-10/month for small scale)
- **CAPTCHA**: Free tiers available (Turnstile, reCAPTCHA, hCaptcha)
- **IP Blocklist**: In-memory or database (no external costs)
- **Email Validation**: Optional external service (minimal cost)
- **File Scanning**: Optional (future, external service cost)

**Recommendation**: Start with Phase 1 measures (free), add Phase 2/3 as needed based on abuse patterns.

## Phase 5: Performance & Cost Optimization

### 5.1 Database Optimization

- **JSONB Indexing**: Create GIN indexes on frequently queried JSON fields if needed
- **Selective Loading**: Only load form config when needed (not on every list query)
- **Caching**: Cache form configs in Redis (optional, for high-traffic forms)
- **Archive Strategy**: Archive old forms instead of deleting (soft delete)

### 5.2 API Optimization

- **Minimal Validation**: Server-side validation only (no pre-flight checks)
- **Single Request**: Form submission in single API call (no multi-step)
- **Batch Operations**: Bulk operations for form management (if needed)
- **Response Size**: Minimal response payloads (only essential data)

### 5.3 Storage Optimization

- **Lifetime Data**: Forms and tickets stored indefinitely (as requested)
- **No Temporary Storage**: No temp files or intermediate storage
- **File Attachments**: Store in cloud storage (S3, etc.) with ticket reference
- **Cleanup**: Archive inactive forms, keep tickets forever

### 5.4 Cost Considerations

- **No External Services**: Avoid external form builders (build custom)
- **Minimal Processing**: Simple validation, no heavy computation
- **Efficient Queries**: Use indexes, avoid N+1 queries
- **CDN**: Use CDN for static form assets (if needed)
- **Caching**: Cache form configs to reduce DB queries

## Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Database migration for SupportForm model
- [ ] Form service with CRUD operations
- [ ] Basic API routes (GET, POST, PUT, DELETE)
- [ ] Navigation item and routing

### Phase 2: Form Builder UI (Week 2)

- [ ] Form list page
- [ ] Form builder component (drag-and-drop)
- [ ] Field editor component
- [ ] Form settings panel
- [ ] Form preview component
- [ ] Create/edit form pages

### Phase 3: Embed Form (Week 3)

- [ ] Embed form page (`/embed/form`)
- [ ] Dynamic form renderer
- [ ] Field type components
- [ ] Form submission handler
- [ ] Success/error states
- [ ] Theming support

### Phase 4: Integration & Testing (Week 4)

- [ ] Form submission API endpoint
- [ ] Ticket creation from form
- [ ] Form analytics
- [ ] Embed code generation
- [ ] Testing and bug fixes
- [ ] Documentation

### Phase 5: Polish & Optimization (Week 5)

- [ ] Performance optimization
- [ ] Spam protection
- [ ] Mobile responsiveness
- [ ] Error handling improvements
- [ ] User documentation
- [ ] Embed guide

## Technical Decisions

### Why JSON for Form Config?

- **Flexibility**: No schema changes needed for new field types
- **Performance**: Single query to load form config
- **Cost**: No additional tables/joins
- **Simplicity**: Easy to serialize/deserialize

### Why Embed Code Instead of Form ID?

- **Security**: Obscure internal IDs
- **URL-Friendly**: Short codes easier to share
- **Public Access**: Forms can be public without exposing internal structure

### Why Single API Call?

- **Performance**: No round-trips
- **Simplicity**: Easier error handling
- **Cost**: Fewer API calls = lower costs

### Why Iframe Over JavaScript Widget?

- **Isolation**: CSS/JS conflicts avoided
- **Security**: Sandboxed execution
- **Simplicity**: Easier to implement initially
- **Future**: Can add JS widget later if needed

## Future Enhancements

1. **JavaScript Widget**: Similar to chat widget, for advanced customization
2. **Conditional Logic**: Show/hide fields based on other field values
3. **Multi-Step Forms**: Break forms into steps
4. **Form Templates**: Pre-built form templates
5. **Advanced Analytics**: Charts, conversion rates, abandonment tracking
6. **A/B Testing**: Test different form configurations
7. **Integration**: Webhook support for form submissions
8. **Email Notifications**: Auto-notify on form submission
9. **File Upload**: Support file attachments in forms
10. **Autocomplete**: Address/location autocomplete fields

## Success Metrics

- **Performance**: Form load < 500ms, submission < 1s
- **Cost**: Minimal DB queries, no external API calls
- **Usability**: Forms created in < 5 minutes
- **Reliability**: 99.9% submission success rate
- **Adoption**: Forms created and embedded by users

## Risk Mitigation

1. **Spam**: Implement basic spam protection, monitor submissions
2. **Performance**: Monitor DB query performance, add indexes as needed
3. **Storage**: Monitor database growth, implement archiving strategy
4. **Security**: Validate all inputs, rate limit submissions
5. **Compatibility**: Test across browsers, mobile devices
