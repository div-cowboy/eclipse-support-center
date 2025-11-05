# Form Security Testing Guide

## Overview

This guide provides step-by-step instructions for testing all security features implemented in the Support Form System.

## Prerequisites

1. Have a form created in the system
2. Have the embed code for the form
3. Access to browser developer tools
4. Optional: Postman or similar API testing tool

## Test Setup

### 1. Get Form Embed Code

1. Navigate to `/app/forms`
2. Click on a form to view details
3. Copy the embed code (e.g., `abc123`)
4. The embed URL will be: `/embed/form?code=abc123`

### 2. Test Form Submission Endpoint

The submission endpoint is: `POST /api/forms/embed/[embedCode]/submit`

---

## Test Cases

### 1. ✅ Normal Form Submission (Baseline Test)

**Purpose**: Verify the form works correctly with all security features enabled.

**Steps**:
1. Navigate to `/embed/form?code=YOUR_EMBED_CODE`
2. Wait at least 3 seconds after page loads
3. Fill out all required fields
4. Submit the form
5. Verify success message appears

**Expected Result**: 
- ✅ Form submits successfully
- ✅ Success message displayed
- ✅ Ticket created in system

**Verification**:
- Check ticket list at `/app/tickets`
- Verify ticket was created with form data
- Check ticket metadata includes security info

---

### 2. 🚦 Rate Limiting Tests

#### Test 2.1: Per IP Rate Limit (15 minutes)

**Purpose**: Verify rate limiting blocks rapid submissions from same IP.

**Steps**:
1. Submit form 5 times quickly (within 15 minutes)
2. Try to submit a 6th time

**Expected Result**:
- ✅ First 5 submissions succeed
- ❌ 6th submission returns HTTP 429
- Response includes `Retry-After` header
- Error message: "Rate limit exceeded"

**Manual Test**:
```bash
# Using curl (replace EMBED_CODE with your actual embed code)
for i in {1..6}; do
  echo "Submission $i"
  curl -X POST http://localhost:3000/api/forms/embed/EMBED_CODE/submit \
    -H "Content-Type: application/json" \
    -d '{"formData":{"name":"Test","email":"test@example.com","_csrf_token":"TOKEN"}}'
  echo ""
  sleep 1
done
```

**Browser Test**:
1. Open browser console
2. Run this script multiple times quickly:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: 'Test',
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN' // Get from form load
    }
  })
}).then(r => r.json()).then(console.log);
```

#### Test 2.2: Rate Limit Reset

**Purpose**: Verify rate limit resets after time window.

**Steps**:
1. Submit form 5 times (hit rate limit)
2. Wait 16 minutes (15 minutes + buffer)
3. Try to submit again

**Expected Result**:
- ✅ Submission succeeds after wait period

#### Test 2.3: Per Form Rate Limit

**Purpose**: Verify rate limiting per form embed code.

**Steps**:
1. Create 2 different forms
2. Submit form 1, 10 times in 1 minute
3. Check if 11th submission is blocked

**Expected Result**:
- ✅ First 10 submissions succeed
- ❌ 11th submission blocked (per form limit)

---

### 3. 🔒 CSRF Protection Tests

#### Test 3.1: Missing CSRF Token

**Purpose**: Verify form rejects submissions without CSRF token.

**Steps**:
1. Load form (get CSRF token)
2. Manually submit form data without CSRF token:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: 'Test',
      email: 'test@example.com'
      // No _csrf_token
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Result**:
- ❌ HTTP 403 Forbidden
- Error: "Invalid or missing CSRF token"

#### Test 3.2: Invalid CSRF Token

**Purpose**: Verify form rejects submissions with invalid CSRF token.

**Steps**:
1. Load form (get valid CSRF token)
2. Submit with fake CSRF token:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: 'Test',
      email: 'test@example.com',
      _csrf_token: 'fake_token_12345'
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Result**:
- ❌ HTTP 403 Forbidden
- Error: "Invalid or missing CSRF token"

#### Test 3.3: Expired CSRF Token

**Purpose**: Verify expired CSRF tokens are rejected.

**Steps**:
1. Load form (get CSRF token)
2. Wait 31 minutes (token expires after 30 minutes)
3. Try to submit form

**Expected Result**:
- ❌ HTTP 403 Forbidden
- Error: "Invalid or missing CSRF token"

---

### 4. 🍯 Honeypot Field Tests

#### Test 4.1: Timestamp Honeypot - Too Fast

**Purpose**: Verify form rejects submissions made too quickly.

**Steps**:
1. Load form
2. Immediately submit form (within 2 seconds)
3. Use browser console to submit quickly:
```javascript
// Get form load time
const loadTime = Date.now();
// Submit immediately (within 2 seconds)
setTimeout(() => {
  fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: {
        name: 'Test',
        email: 'test@example.com',
        _csrf_token: 'YOUR_TOKEN',
        _form_timestamp: loadTime.toString(),
        _form_load_time: loadTime.toString()
      }
    })
  }).then(r => r.json()).then(console.log);
}, 2000); // 2 seconds (less than 3 second minimum)
```

**Expected Result**:
- ❌ HTTP 400 Bad Request
- Error: "Invalid form submission" (generic, doesn't reveal honeypot)
- Check server logs for honeypot trigger

#### Test 4.2: Timestamp Honeypot - Missing

**Purpose**: Verify form rejects submissions without timestamp.

**Steps**:
1. Submit form without `_form_timestamp` field:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: 'Test',
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN'
      // No _form_timestamp
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Result**:
- ❌ HTTP 400 Bad Request
- Error: "Invalid form submission"
- Server logs show "timestamp_missing"

#### Test 4.3: Field Name Honeypot

**Purpose**: Verify form rejects when honeypot fields are filled.

**Steps**:
1. Fill the `website` or `url` honeypot field:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: 'Test',
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN',
      _form_timestamp: Date.now().toString(),
      website: 'http://spam.com', // Honeypot filled!
      url: '' // Empty is OK
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Result**:
- ❌ HTTP 400 Bad Request
- Error: "Invalid form submission"
- Server logs show "honeypot_website" trigger

#### Test 4.4: Timestamp Honeypot - Too Old

**Purpose**: Verify form rejects stale submissions (> 30 minutes).

**Steps**:
1. Submit with old timestamp (31 minutes ago):
```javascript
const oldTime = Date.now() - (31 * 60 * 1000); // 31 minutes ago
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: 'Test',
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN',
      _form_timestamp: oldTime.toString(),
      _form_load_time: oldTime.toString()
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Result**:
- ❌ HTTP 400 Bad Request
- Error: "Invalid form submission"
- Server logs show "timestamp_too_old"

---

### 5. 🧹 Input Sanitization Tests

#### Test 5.1: XSS Prevention

**Purpose**: Verify XSS attempts are sanitized.

**Steps**:
1. Submit form with XSS payload:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: '<script>alert("XSS")</script>',
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN',
      _form_timestamp: Date.now().toString(),
      _form_load_time: Date.now().toString()
    }
  })
}).then(r => r.json()).then(r => {
  // Check ticket to see if script tags are escaped
  console.log(r);
});
```

**Expected Result**:
- ✅ Form submits successfully
- ✅ Script tags are HTML entity encoded in ticket
- ✅ Ticket description shows: `&lt;script&gt;alert("XSS")&lt;/script&gt;`

#### Test 5.2: Length Limits

**Purpose**: Verify field length limits are enforced.

**Steps**:
1. Submit form with very long text (> 10,000 chars):
```javascript
const longText = 'a'.repeat(10001); // 10,001 characters
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: longText,
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN',
      _form_timestamp: Date.now().toString(),
      _form_load_time: Date.now().toString()
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Result**:
- ✅ Form submits successfully
- ✅ Text is truncated to 10,000 characters in ticket

#### Test 5.3: Invalid Field Names

**Purpose**: Verify invalid field names are rejected.

**Steps**:
1. Try to submit with invalid field name:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      'invalid-field!': 'test', // Invalid characters
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN',
      _form_timestamp: Date.now().toString(),
      _form_load_time: Date.now().toString()
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Result**:
- ❌ HTTP 400 Bad Request
- Error: "Invalid field name"

---

### 6. 🔐 Security Headers Test

**Purpose**: Verify security headers are present in responses.

**Steps**:
1. Submit form and check response headers:
```javascript
fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    formData: {
      name: 'Test',
      email: 'test@example.com',
      _csrf_token: 'YOUR_TOKEN',
      _form_timestamp: Date.now().toString(),
      _form_load_time: Date.now().toString()
    }
  })
}).then(r => {
  console.log('Headers:', {
    'Content-Security-Policy': r.headers.get('Content-Security-Policy'),
    'X-Frame-Options': r.headers.get('X-Frame-Options'),
    'X-Content-Type-Options': r.headers.get('X-Content-Type-Options'),
    'Referrer-Policy': r.headers.get('Referrer-Policy'),
    'X-RateLimit-Limit': r.headers.get('X-RateLimit-Limit'),
    'X-RateLimit-Remaining': r.headers.get('X-RateLimit-Remaining')
  });
  return r.json();
}).then(console.log);
```

**Expected Result**:
- ✅ All security headers present
- ✅ `Content-Security-Policy` set
- ✅ `X-Frame-Options: SAMEORIGIN`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ Rate limit headers present

---

### 7. 📊 Request Metadata Logging Test

**Purpose**: Verify security metadata is stored in tickets.

**Steps**:
1. Submit a form successfully
2. Check the created ticket's metadata:
   - Go to `/app/tickets`
   - Open the ticket
   - Check `metadata` field (in database or ticket details)

**Expected Result**:
- ✅ Ticket metadata includes:
  - `ipAddress` (hashed)
  - `userAgent`
  - `requestOrigin`
  - `referer`
  - `submissionTime`
  - `formLoadTime`
  - `rateLimitStatus`

---

## Automated Testing Script

Create a test script to run all tests:

```typescript
// test-form-security.ts
import { createForm } from '@/lib/form-service';
import { getFormByEmbedCode } from '@/lib/form-service';

async function testFormSecurity() {
  // 1. Create a test form
  const form = await createForm({
    organizationId: 'test-org-id',
    name: 'Security Test Form',
    fields: [
      {
        id: 'name',
        type: 'text',
        label: 'Name',
        name: 'name',
        required: true,
        order: 0
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        name: 'email',
        required: true,
        order: 1
      }
    ],
    settings: {},
    createdById: 'test-user-id'
  });

  const embedCode = form.embedCode;
  console.log('Test form created:', embedCode);

  // 2. Test rate limiting
  // ... (implement rate limit tests)

  // 3. Test CSRF protection
  // ... (implement CSRF tests)

  // 4. Test honeypot
  // ... (implement honeypot tests)

  console.log('All tests completed!');
}

testFormSecurity();
```

---

## Browser Developer Tools Tips

### 1. Monitor Network Requests

1. Open DevTools → Network tab
2. Filter by "XHR" or "Fetch"
3. Submit form
4. Check request/response details

### 2. Check Cookies

1. Open DevTools → Application tab
2. Check Cookies
3. Verify `form_csrf_token` cookie is set

### 3. Test Rate Limiting Quickly

1. Open DevTools → Console
2. Run this script multiple times:
```javascript
// Get CSRF token first
fetch('/api/forms/embed/YOUR_EMBED_CODE')
  .then(r => r.json())
  .then(data => {
    const token = data.csrfToken;
    const loadTime = Date.now();
    
    // Submit form
    return fetch('/api/forms/embed/YOUR_EMBED_CODE/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formData: {
          name: 'Test',
          email: 'test@example.com',
          _csrf_token: token,
          _form_timestamp: loadTime.toString(),
          _form_load_time: loadTime.toString()
        }
      })
    });
  })
  .then(r => r.json())
  .then(console.log);
```

---

## Common Issues

### Issue: Rate limit not working

**Solution**: 
- Check if rate limiter is initialized
- Verify IP address detection (check `x-forwarded-for` header)
- Check server logs for rate limit checks

### Issue: CSRF token always invalid

**Solution**:
- Verify cookie is being set (check browser cookies)
- Check cookie `SameSite` attribute
- Ensure token is passed in both cookie and form data

### Issue: Honeypot always triggered

**Solution**:
- Verify form load time is set correctly
- Check minimum time requirement (3 seconds)
- Ensure timestamp is passed as string

---

## Success Criteria

All tests pass when:

- ✅ Normal submissions work correctly
- ✅ Rate limiting blocks excessive submissions
- ✅ CSRF protection rejects invalid tokens
- ✅ Honeypot fields detect bots
- ✅ Input sanitization prevents XSS
- ✅ Security headers are present
- ✅ Request metadata is logged

---

## Next Steps

After testing:

1. Monitor production logs for security events
2. Set up alerts for high rate limit violations
3. Review honeypot triggers regularly
4. Update rate limits based on usage patterns

