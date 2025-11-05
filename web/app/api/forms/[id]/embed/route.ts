/**
 * API Route for Form Embed Configuration
 * GET /api/forms/[id]/embed - Get embed code and configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { getForm } from "@/lib/form-service";

/**
 * GET /api/forms/[id]/embed
 * Get embed code and configuration for a form
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

    // Get the base URL from the request
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const embedUrl = `${origin}/embed/form?code=${form.embedCode}`;

    // Generate iframe embed code
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;

    return NextResponse.json({
      success: true,
      embed: {
        formId: form.id,
        embedCode: form.embedCode,
        embedUrl,
        iframeCode,
        isPublic: form.isPublic,
        status: form.status,
      },
    });
  } catch (error: any) {
    console.error("Error fetching embed configuration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch embed configuration" },
      { status: 500 }
    );
  }
}
