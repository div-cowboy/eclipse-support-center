import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required for WebSocket authentication\n" +
    "  → Add JWT_SECRET to your .env.local file\n" +
    "  → See .env.local.example for reference\n" +
    "  → Generate a secure secret: openssl rand -hex 32\n" +
    "  → This value MUST match the JWT_SECRET in your WebSocket server (.env)"
  );
}

if (JWT_SECRET === "your-jwt-secret-here") {
  throw new Error(
    "JWT_SECRET is set to placeholder value\n" +
    "  → Generate a secure secret: openssl rand -hex 32\n" +
    "  → Update .env.local with the generated value\n" +
    "  → This value MUST match the JWT_SECRET in your WebSocket server (.env)"
  );
}

/**
 * Generate WebSocket authentication token
 * GET /api/ws/token?chatId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();

    // Allow unauthenticated users for embed chats (they use temporary user IDs)
    // But prefer authenticated sessions when available
    const userId =
      session?.user?.id ||
      `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chatId = request.nextUrl.searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId query parameter is required" },
        { status: 400 }
      );
    }

    // Generate JWT token for WebSocket authentication
    const token = jwt.sign(
      {
        userId,
        chatId,
        isAuthenticated: !!session?.user?.id,
        // Token expires in 2 hours
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
      },
      JWT_SECRET
    );

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

    // Validate WebSocket URL format
    if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
      console.warn(
        `NEXT_PUBLIC_WS_URL format may be incorrect: ${wsUrl}\n` +
        `  → Use ws://localhost:8080 for local development\n` +
        `  → Use wss://your-server.fly.dev for production`
      );
    }

    return NextResponse.json({
      token,
      wsUrl,
      userId,
      chatId,
    });
  } catch (error) {
    console.error("Error generating WebSocket token:", error);
    return NextResponse.json(
      {
        error: "Failed to generate WebSocket token",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
