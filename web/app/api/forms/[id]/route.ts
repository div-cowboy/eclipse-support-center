/**
 * API Routes for Form by ID
 * GET /api/forms/[id] - Get form details
 * PUT /api/forms/[id] - Update form
 * DELETE /api/forms/[id] - Archive form
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import {
  getForm,
  updateForm,
  archiveForm,
  deleteForm,
  type UpdateFormInput,
} from "@/lib/form-service";
import { SupportFormStatus, TicketPriority } from "@prisma/client";

/**
 * GET /api/forms/[id]
 * Get form details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const form = await getForm(id);

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      form,
    });
  } catch (error: any) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch form" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/forms/[id]
 * Update form
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate priority if provided
    if (
      body.defaultPriority &&
      !Object.values(TicketPriority).includes(body.defaultPriority)
    ) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (
      body.status &&
      !Object.values(SupportFormStatus).includes(body.status)
    ) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate fields if provided
    if (body.fields !== undefined) {
      if (!Array.isArray(body.fields) || body.fields.length === 0) {
        return NextResponse.json(
          { error: "fields must be a non-empty array" },
          { status: 400 }
        );
      }
    }

    // Build update input
    const updateInput: UpdateFormInput = {
      name: body.name,
      description: body.description,
      fields: body.fields,
      settings: body.settings,
      defaultValues: body.defaultValues,
      defaultCategory: body.defaultCategory,
      defaultPriority: body.defaultPriority,
      autoAssignToId: body.autoAssignToId,
      tags: body.tags,
      status: body.status,
      isPublic: body.isPublic,
    };

    // Remove undefined values
    Object.keys(updateInput).forEach(
      (key) =>
        updateInput[key as keyof UpdateFormInput] === undefined &&
        delete updateInput[key as keyof UpdateFormInput]
    );

    const form = await updateForm(id, updateInput);

    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        status: form.status,
        embedCode: form.embedCode,
        isPublic: form.isPublic,
        organizationId: form.organizationId,
        submissionCount: form.submissionCount,
        updatedAt: form.updatedAt,
        viewUrl: `/app/forms/${form.id}`,
      },
    });
  } catch (error: any) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update form" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forms/[id]
 * Archive form (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const form = await archiveForm(id);

    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        name: form.name,
        status: form.status,
      },
    });
  } catch (error: any) {
    console.error("Error archiving form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to archive form" },
      { status: 500 }
    );
  }
}
