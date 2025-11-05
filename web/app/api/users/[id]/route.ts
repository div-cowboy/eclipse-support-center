import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Get user by ID (internal API only)
 * Used by WebSocket server to fetch user info for agent_joined events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify internal API secret
    const internalSecret = request.headers.get("X-Internal-Secret");
    if (internalSecret !== INTERNAL_API_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized - invalid internal secret" },
        { status: 401 }
      );
    }

    const userId = params.id;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
