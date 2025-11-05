/**
 * API Route for Ticket Statistics
 * GET /api/tickets/stats - Get ticket statistics for an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { getTicketStats } from "@/lib/ticket-service";

/**
 * GET /api/tickets/stats
 * Get ticket statistics for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const stats = await getTicketStats(organizationId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("Error fetching ticket stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ticket stats" },
      { status: 500 }
    );
  }
}

