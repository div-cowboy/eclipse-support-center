/**
 * API Routes for Forms
 * GET /api/forms - List forms
 * POST /api/forms - Create a new form
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import {
  createForm,
  listForms,
  type CreateFormInput,
  type FormFilters,
} from "@/lib/form-service";
import { SupportFormStatus, TicketPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/forms
 * List forms with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const isPublic = searchParams.get("isPublic");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Parse status filter
    let statusFilter: SupportFormStatus | SupportFormStatus[] | undefined;
    if (status) {
      const statusValues = status.split(",") as SupportFormStatus[];
      statusFilter =
        statusValues.length === 1 ? statusValues[0] : statusValues;
    }

    // Parse isPublic filter
    let isPublicFilter: boolean | undefined;
    if (isPublic !== null) {
      isPublicFilter = isPublic === "true";
    }

    // Build filters
    const filters: FormFilters = {
      organizationId,
      status: statusFilter,
      isPublic: isPublicFilter,
      search: search || undefined,
      page,
      limit: Math.min(limit, 100), // Cap at 100
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    const result = await listForms(filters);

    return NextResponse.json({
      success: true,
      forms: result.forms,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error listing forms:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list forms" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forms
 * Create a new form
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (!body.fields || !Array.isArray(body.fields) || body.fields.length === 0) {
      return NextResponse.json(
        { error: "fields array is required and must contain at least one field" },
        { status: 400 }
      );
    }

    // Get user
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    // Create form input
    const formInput: CreateFormInput = {
      organizationId: body.organizationId,
      name: body.name,
      description: body.description,
      fields: body.fields,
      settings: body.settings,
      defaultValues: body.defaultValues,
      defaultCategory: body.defaultCategory,
      defaultPriority: body.defaultPriority,
      autoAssignToId: body.autoAssignToId,
      tags: body.tags,
      isPublic: body.isPublic !== undefined ? body.isPublic : true,
      createdById: user.id,
    };

    const form = await createForm(formInput);

    return NextResponse.json(
      {
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
          createdAt: form.createdAt,
          viewUrl: `/app/forms/${form.id}`,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create form" },
      { status: 500 }
    );
  }
}

