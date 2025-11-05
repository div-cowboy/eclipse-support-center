import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Handle CORS for embed endpoints
  if (request.nextUrl.pathname.startsWith("/api/embed/")) {
    const response = NextResponse.next();

    // Set CORS headers for embed endpoints
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // Handle iframe embedding security
  if (request.nextUrl.pathname.startsWith("/embed/")) {
    const response = NextResponse.next();

    // Allow iframe embedding from any domain
    response.headers.set("X-Frame-Options", "ALLOWALL");
    response.headers.set("Content-Security-Policy", "frame-ancestors *");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/embed/:path*", "/embed/:path*"],
};
