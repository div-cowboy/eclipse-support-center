/**
 * API Route for Form by Embed Code (Public)
 * GET /api/forms/embed/[embedCode] - Get form by embed code (public)
 */

import { NextRequest, NextResponse } from "next/server";
import { getFormByEmbedCode } from "@/lib/form-service";

/**
 * GET /api/forms/embed/[embedCode]
 * Get form by embed code (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { embedCode: string } }
) {
  try {
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

    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        fields: form.fields,
        settings: form.settings,
        defaultValues: form.defaultValues,
        embedCode: form.embedCode,
        organizationId: form.organizationId,
      },
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch form";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

