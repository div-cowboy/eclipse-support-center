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

/**
 * POST /api/forms/embed/[embedCode]/submit
 * Submit ticket from form (public endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { embedCode: string } }
) {
  try {
    // Get form by embed code
    const form = await getFormByEmbedCode(params.embedCode);

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

    // Parse form data
    const body = await request.json();
    const formData = body.formData || {};

    // Validate form submission
    const validation = validateFormSubmission(form, formData);

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

    // Extract email and name from form data
    const email = formData.email || formData.Email || "";
    const name = formData.name || formData.Name || "";

    // Build description from form fields
    const descriptionParts: string[] = [];
    const fields = form.fields as FormField[];

    for (const field of fields) {
      const value = formData[field.name];
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
      ? formData[subjectField.name]
      : form.name || "Form Submission";

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
        formFields: formData,
      },
      metadata: {
        origin: "form",
        formId: form.id,
        embedCode: form.embedCode,
      },
    });

    // Increment submission count
    await incrementSubmissionCount(form.id);

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to submit form";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
