/**
 * API Route for Form by Embed Code (Public)
 * GET /api/forms/embed/[embedCode] - Get form by embed code (public)
 */

import { NextRequest, NextResponse } from "next/server";
import { getFormByEmbedCode } from "@/lib/form-service";
import { generateCSRFToken } from "@/lib/form-security";

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

    // Generate CSRF token for form submission
    const csrfToken = generateCSRFToken();

    // Set CSRF token in cookie (for same-site validation)
    const response = NextResponse.json({
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
      csrfToken, // Include token in response for client
    });

    // Set CSRF token cookie (30 minute expiration)
    response.cookies.set("form_csrf_token", csrfToken, {
      httpOnly: false, // Need to access from client for form submission
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error fetching form:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch form";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

