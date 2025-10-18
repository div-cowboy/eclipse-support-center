import { handlers } from "@/app/auth"; // Referring to the auth.ts we just created

// Configure runtime for Node.js instead of edge
export const runtime = "nodejs";

export const { GET, POST } = handlers;
