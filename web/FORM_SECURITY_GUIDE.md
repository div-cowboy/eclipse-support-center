# Form Security Guide

## Overview

This document outlines comprehensive security measures to protect form endpoints from bot spam, abuse, and malicious attacks. Designed for production-ready security from day one, with scalability for future productization.

## Security Layers

### 1. Rate Limiting (Multi-Layer Defense)

**Primary Layer - Per IP Address**:
- 5 submissions per 15 minutes per IP
- 20 submissions per hour per IP  
- 100 submissions per day per IP
- **Storage**: Redis (production) or in-memory (development)

**Secondary Layer - Per Form**:
- 10 submissions per minute per form
- 50 submissions per hour per form

**Tertiary Layer - Per Organization**:
- 1000 submissions per day per organization

**System-Level**:
- 10,000 submissions per hour globally (circuit breaker)

### 2. Bot Detection

#### Honeypot Fields
- **Timestamp Honeypot**: Hidden field `_form_timestamp` filled by JS
  - If filled too quickly (< 3 seconds) = bot
  - If not filled = bot (no JS execution)
  
- **Field Name Honeypot**: Hidden field `website` or `url`
  - If filled = likely bot
  - CSS: `display: none` or `position: absolute; left: -9999px`

#### Time-Based Validation
- **Minimum Time**: 3 seconds between page load and submission
- **Maximum Time**: 30 minutes (prevents stale submissions)
- **Interaction Tracking**: Require at least one user interaction

### 3. CSRF Protection

- **CSRF Token**: Unique token per form load, expires in 30 minutes
- **Origin Validation**: Check `Origin` header matches expected domain
- **SameSite Cookies**: `SameSite=Strict` for form session cookies

### 4. Input Validation & Sanitization

**Server-Side Only** (Never trust client):
- Field type validation (match form configuration)
- Length validation (10,000 chars max for text, 254 for email)
- Content sanitization (prevent XSS)
- Field name whitelist (alphanumeric, underscore, hyphen)
- Email format validation (RFC 5322)

### 5. Email Security

- **Format Validation**: RFC 5322 compliant
- **Disposable Email Detection**: Block known disposable email providers
- **Email Rate Limiting**: 3 submissions per email per day
- **Domain Validation**: Optional MX record lookup (can be slow)

### 6. File Upload Security

- **File Type Validation**: Whitelist MIME types, scan file headers
- **File Size Limits**: 10MB per file, 50MB total per submission
- **Executable Blocking**: Reject .exe, .sh, .bat, etc.
- **Isolated Storage**: Store in cloud storage (S3), don't execute files
- **Unique Filenames**: Prevent overwrites

### 7. CAPTCHA Integration (Optional)

**Recommended**: Cloudflare Turnstile (privacy-friendly, free tier)
**Alternatives**: 
- Google reCAPTCHA v3 (invisible, score-based)
- hCaptcha (privacy-focused)

**Strategy**:
- Phase 1: Basic rate limiting + honeypot (no CAPTCHA)
- Phase 2: Add CAPTCHA for high-risk scenarios (configurable per form)
- Phase 3: Advanced bot detection if needed

### 8. Authentication & Authorization

**Admin Endpoints** (Form Management):
- All `/api/forms/*` require session authentication
- Verify user is organization member
- Verify user has permissions

**Public Endpoint** (Form Submission):
- `/api/forms/[embedCode]/submit` - Only public endpoint
- Heavy rate limiting + spam protection
- Rate limit penalties for spam attempts

**Form Access Control**:
- Verify form exists and is active
- Verify form is public (if `isPublic: false`, require auth)
- Verify form belongs to organization

### 9. IP Reputation & Blocking

- **IP Blocklist**: Maintain list of known bad IPs
- **IP Allowlist**: Trusted IPs for bypassing rate limits (internal testing)
- **Geo-Blocking**: Optional, configurable per organization

### 10. Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Implementation Priority

### Phase 1 (MVP - Essential) ✅
- [x] Rate limiting (per IP, per form)
- [x] Honeypot fields (timestamp + field name)
- [x] Time-based validation (min 3 seconds)
- [x] Input validation & sanitization
- [x] CSRF protection
- [x] Origin validation
- [x] Email format validation

### Phase 2 (Production-Ready)
- [ ] Redis-based rate limiting (distributed)
- [ ] Disposable email detection
- [ ] IP blocklist
- [ ] Enhanced logging
- [ ] Security event monitoring
- [ ] File upload security

### Phase 3 (Advanced)
- [ ] CAPTCHA integration (configurable per form)
- [ ] Behavioral analysis
- [ ] IP reputation services
- [ ] Advanced bot detection
- [ ] Email domain validation (MX lookup)

## Security Configuration (Per Form)

```typescript
interface FormSecuritySettings {
  rateLimitEnabled: boolean;
  rateLimitPerIP: number; // submissions per hour
  honeypotEnabled: boolean;
  captchaEnabled: boolean;
  captchaType: 'turnstile' | 'recaptcha' | 'hcaptcha' | 'none';
  minSubmissionTime: number; // seconds
  requireEmail: boolean;
  requireName: boolean;
  blockDisposableEmails: boolean;
  allowedFileTypes?: string[]; // MIME types
  maxFileSize: number; // bytes
}
```

## Request Metadata & Logging

**Store in Ticket Metadata**:
- IP address (hashed)
- User-Agent
- Origin
- Submission time
- Form load time
- Honeypot triggers
- Rate limit status

**Security Event Logging**:
- Log all rate limit violations
- Log honeypot triggers
- Log suspicious patterns
- Alert on high-volume abuse

## Cost Considerations

**Security Measures Impact**:
- **Rate Limiting**: Redis costs (~$5-10/month for small scale)
- **CAPTCHA**: Free tiers available (Turnstile, reCAPTCHA, hCaptcha)
- **IP Blocklist**: In-memory or database (no external costs)
- **Email Validation**: Optional external service (minimal cost)
- **File Scanning**: Optional (future, external service cost)

**Recommendation**: Start with Phase 1 measures (free), add Phase 2/3 as needed based on abuse patterns.

## Security Best Practices

1. **Defense in Depth**: Multiple layers of protection
2. **Fail Secure**: Default to blocking suspicious requests
3. **Privacy**: Hash IPs, minimize data collection
4. **Monitoring**: Log all security events
5. **Updates**: Keep dependencies updated
6. **Testing**: Regular security audits and penetration testing

## Rate Limiting Implementation

**Storage Format**: `rate_limit:form:${embedCode}:${ip}:${timeWindow}`

**Response Format**:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600,
  "limit": 5,
  "remaining": 0,
  "resetAt": "2024-01-01T12:00:00Z"
}
```

**Development**: In-memory cache (Map/TTL)
**Production**: Redis with TTL keys

## Honeypot Implementation

1. **Timestamp Honeypot**:
   - Hidden field: `_form_timestamp`
   - Filled by JavaScript on page load
   - Validate: filled AND time difference > 3 seconds

2. **Field Name Honeypot**:
   - Hidden field: `website` or `url`
   - CSS: `display: none` or `position: absolute; left: -9999px`
   - If filled = reject silently (don't reveal detection)

3. **Validation**:
   - Check on submission
   - Log honeypot triggers for analytics
   - Optionally: increase rate limit penalty

## Example: Secure Form Submission Flow

```
1. User loads form page
   ├─ Generate CSRF token
   ├─ Set form load timestamp
   ├─ Inject honeypot fields (hidden)
   └─ Return form config

2. User fills form (minimum 3 seconds)
   ├─ JavaScript fills timestamp honeypot
   ├─ User interacts with form
   └─ User submits form

3. Server validates submission
   ├─ Check rate limits (IP, form, org)
   ├─ Validate CSRF token
   ├─ Check origin header
   ├─ Validate honeypot fields
   ├─ Check time-based validation (min 3 seconds)
   ├─ Validate input (types, lengths, sanitization)
   ├─ Validate email format (and disposable check)
   ├─ Validate file uploads (if any)
   └─ Log security metadata

4. Create ticket
   ├─ Store form submission data
   ├─ Store security metadata
   ├─ Apply form defaults (category, priority, tags)
   └─ Return success response
```

## Monitoring & Alerts

**Key Metrics to Monitor**:
- Rate limit violations per hour
- Honeypot triggers per hour
- Suspicious patterns (too fast submissions, etc.)
- Failed submissions (distinguish spam vs errors)
- Form load times (unusually fast = bot)

**Alert Thresholds**:
- > 100 rate limit violations per hour
- > 50 honeypot triggers per hour
- > 1000 submissions per hour (global)
- Unusual spike in submissions (3x normal)

## Testing Security

**Test Cases**:
1. Rate limiting (submit multiple times quickly)
2. Honeypot detection (fill honeypot fields)
3. Time-based validation (submit too quickly)
4. CSRF protection (submit without token)
5. Origin validation (submit from wrong origin)
6. Input validation (submit invalid data)
7. Email validation (submit invalid/disposable emails)
8. File upload security (submit executable files)

## Future Enhancements

1. **Machine Learning**: Behavioral analysis for bot detection
2. **Advanced Fingerprinting**: Browser fingerprinting for bot detection
3. **Threat Intelligence**: Integration with threat intelligence feeds
4. **Automated Response**: Auto-block IPs after multiple violations
5. **Webhook Notifications**: Alert external systems on security events

