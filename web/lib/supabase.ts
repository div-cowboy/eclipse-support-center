/**
 * Supabase Client for Real-Time Communication
 * Uses Supabase Realtime for cross-tab/cross-window/cross-origin messaging
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Create Supabase client with Realtime enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit for broadcasts
    },
  },
});

console.log("✅ Supabase Realtime client initialized");
console.log("📡 Project URL:", supabaseUrl);

// Export types for use in components
export type { RealtimeChannel } from "@supabase/supabase-js";
