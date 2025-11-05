/**
 * API Route for Form Submission (Public)
 * POST /api/forms/embed/[embedCode]/submit - Submit ticket from form (public)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getFormByEmbedCode,
  validateFormSubmission,
  incrementSubmissionCount,
  type FormField,
} from "@/lib/form-service";
import { createTicket } from "@/lib/ticket-service";
import { TicketPriority } from "@prisma/client";
import { getClientIP, checkFormSubmissionRateLimit } from "@/lib/rate-limit";
import {
  validateCSRFToken,
  sanitizeFormData,
  validateHoneypot,
  hashIP,
  isValidFieldName,
} from "@/lib/form-security";

/**
 * POST /api/forms/embed/[embedCode]/submit
 * Submit ticket from form (public endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ embedCode: string }> }
) {
  try {
    // Get client IP address
    const clientIP = getClientIP(request);

    // Get form by embed code
    const { embedCode } = await params;
    const form = await getFormByEmbedCode(embedCode);

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Check if form is active and public
    if (form.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Form is not active" },
        { status: 403 }
      );
    }

    if (!form.isPublic) {
      return NextResponse.json(
        { error: "Form is not publicly accessible" },
        { status: 403 }
      );
    }

    // Rate limiting check (before processing form data)
    const rateLimitResult = await checkFormSubmissionRateLimit(
      clientIP,
      embedCode,
      form.organizationId
    );

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt
            ? new Date(rateLimitResult.resetAt).toISOString()
            : undefined,
        },
        { status: 429 }
      );

      // Add security headers
      response.headers.set("X-RateLimit-Limit", "5");
      response.headers.set("X-RateLimit-Remaining", "0");
      if (rateLimitResult.retryAfter) {
        response.headers.set(
          "Retry-After",
          rateLimitResult.retryAfter.toString()
        );
      }

      return response;
    }

    // Parse form data
    const body = await request.json();
    let formData = body.formData || {};

    // Validate CSRF token
    const csrfToken = formData._csrf_token;
    const cookieToken = request.cookies.get("form_csrf_token")?.value || "";

    if (!validateCSRFToken(csrfToken || "", cookieToken)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing CSRF token",
        },
        { status: 403 }
      );
    }

    // Validate honeypot fields
    const honeypotCheck = validateHoneypot(formData);
    if (!honeypotCheck.valid) {
      // Silently reject (don't reveal detection)
      // Log for analytics
      console.warn("Honeypot triggered:", {
        embedCode: embedCode,
        ip: hashIP(clientIP),
        triggers: honeypotCheck.triggered,
      });

      // Return generic error (don't reveal honeypot detection)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid form submission",
        },
        { status: 400 }
      );
    }

    // Validate origin header (optional - allow all origins for MVP, can be configured)
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    // For MVP, we'll allow all origins (can be configured per form later)
    // const allowedDomains = [new URL(request.url).hostname];
    // if (!validateOrigin(origin, referer, allowedDomains)) {
    //   return NextResponse.json(
    //     { success: false, error: "Invalid origin" },
    //     { status: 403 }
    //   );
    // }

    // Build field type map for sanitization
    const fields = form.fields as unknown as FormField[];
    const fieldTypes: Record<string, string> = {};
    for (const field of fields) {
      // Validate field name
      if (!isValidFieldName(field.name)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid field name",
          },
          { status: 400 }
        );
      }
      fieldTypes[field.name] = field.type;
    }

    // Sanitize form data
    formData = sanitizeFormData(formData, fieldTypes);

    // Remove system fields before validation
    const cleanFormData = { ...formData };
    delete cleanFormData._csrf_token;
    delete cleanFormData._form_timestamp;
    delete cleanFormData._form_load_time;

    // Validate form submission
    const validation = validateFormSubmission(form, cleanFormData);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Extract email and name from sanitized form data
    const email = cleanFormData.email || cleanFormData.Email || "";
    const name = cleanFormData.name || cleanFormData.Name || "";

    // Build description from form fields (using sanitized data)
    const descriptionParts: string[] = [];

    for (const field of fields) {
      const value = cleanFormData[field.name];
      if (value !== undefined && value !== null && value !== "") {
        descriptionParts.push(`${field.label}: ${value}`);
      }
    }

    const description = descriptionParts.join("\n\n");

    // Determine subject
    const subjectField = fields.find(
      (f) => f.name === "subject" || f.name === "Subject"
    );
    const subject = subjectField
      ? cleanFormData[subjectField.name]
      : form.name || "Form Submission";

    // Get request metadata for logging
    const userAgent = request.headers.get("user-agent") || "";
    const submissionTime = new Date().toISOString();
    const formLoadTime = formData._form_load_time
      ? new Date(parseInt(formData._form_load_time, 10)).toISOString()
      : undefined;

    // Create ticket
    const ticket = await createTicket({
      organizationId: form.organizationId,
      subject: subject || form.name,
      description: description || "Form submission",
      priority: (form.defaultPriority as TicketPriority) || undefined,
      category: form.defaultCategory || undefined,
      requesterName: name || "Anonymous",
      requesterEmail: email || "",
      assignedToId: form.autoAssignToId || undefined,
      tags: form.tags || [],
      originFormId: form.id, // Link ticket to the form that created it
      customFields: {
        formId: form.id,
        formName: form.name,
        embedCode: form.embedCode,
        formFields: cleanFormData, // Use sanitized data
      },
      metadata: {
        origin: "form",
        formId: form.id,
        embedCode: form.embedCode,
        // Security metadata
        ipAddress: hashIP(clientIP), // Hashed for privacy
        userAgent: userAgent.substring(0, 500), // Limit length
        requestOrigin: origin || undefined, // Renamed to avoid conflict with "origin: form"
        referer: referer || undefined,
        submissionTime,
        formLoadTime,
        rateLimitStatus: {
          remaining: rateLimitResult.remaining || 0,
          resetAt: rateLimitResult.resetAt
            ? new Date(rateLimitResult.resetAt).toISOString()
            : undefined,
        },
      },
    });

    // Increment submission count
    await incrementSubmissionCount(form.id);

    // Build response with security headers
    const response = NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
      },
    });

    // Add security headers
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    );
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-RateLimit-Limit", "5");
    response.headers.set(
      "X-RateLimit-Remaining",
      (rateLimitResult.remaining || 0).toString()
    );

    return response;
  } catch (error) {
    console.error("Error submitting form:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to submit form";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
