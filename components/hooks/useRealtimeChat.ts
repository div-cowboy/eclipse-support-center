/**
 * Unified Real-Time Chat Hook
 *
 * This hook acts as a smart wrapper that chooses between:
 * - Custom WebSocket implementation (recommended for production)
 * - Supabase Realtime (fallback/legacy)
 *
 * The choice is controlled by the NEXT_PUBLIC_USE_WEBSOCKET environment variable.
 */

import { useWebSocketChat } from "./useWebSocketChat";
import { useRealtimeChat as useSupabaseRealtimeChat } from "./useSupabaseRealtimeChat";

// Re-export types from WebSocket hook (they're compatible with Supabase)
export type { WebSocketChatMessage as RealtimeChatMessage } from "./useWebSocketChat";

// Determine which implementation to use
const USE_WEBSOCKET = process.env.NEXT_PUBLIC_USE_WEBSOCKET === "true";

console.log(
  `[useRealtimeChat] Using ${
    USE_WEBSOCKET ? "WebSocket" : "Supabase"
  } implementation`
);

/**
 * Use real-time chat with automatic implementation selection
 */
export function useRealtimeChat(
  options: Parameters<typeof useWebSocketChat>[0]
) {
  // Use WebSocket if enabled, otherwise fall back to Supabase
  if (USE_WEBSOCKET) {
    console.log("[useRealtimeChat] → Using WebSocket implementation");
    return useWebSocketChat(options);
  } else {
    console.log("[useRealtimeChat] → Using Supabase implementation");
    return useSupabaseRealtimeChat(options) as ReturnType<
      typeof useWebSocketChat
    >;
  }
}
