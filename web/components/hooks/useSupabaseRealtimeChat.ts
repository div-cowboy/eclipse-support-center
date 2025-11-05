import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Message structure for real-time chat
 */
export interface RealtimeChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "agent" | "system";
  timestamp: Date;
  sender: {
    id: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
  };
}

/**
 * Event types for real-time chat
 */
export type RealtimeEvent =
  | { type: "message"; payload: RealtimeChatMessage }
  | {
      type: "agent_joined";
      payload: { agentId: string; agentName: string; timestamp: Date };
    }
  | { type: "typing"; payload: { userId: string; isTyping: boolean } }
  | { type: "error"; payload: { message: string } };

interface UseRealtimeChatOptions {
  chatId: string;
  enabled: boolean;
  onMessage?: (message: RealtimeChatMessage) => void;
  onMessageUpdated?: (message: {
    id: string;
    content: string;
    role: "user" | "assistant" | "agent" | "system";
    timestamp: Date;
    updatedAt: Date;
    sender: {
      id: string;
      name: string;
      email?: string | null;
      avatar?: string | null;
    };
  }) => void;
  onAgentJoined?: (agent: {
    agentId: string;
    agentName: string;
    timestamp: Date;
  }) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
  onError?: (error: string) => void;
}

interface UseRealtimeChatReturn {
  sendMessage: (
    content: string,
    role: "USER" | "ASSISTANT" | "AGENT"
  ) => Promise<boolean>;
  sendTypingIndicator: (isTyping: boolean) => void;
  broadcastAgentJoined: (agentId: string, agentName: string) => void;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for real-time chat functionality
 * Subscribes to chat channel and handles message broadcasting
 */
export function useRealtimeChat({
  chatId,
  enabled,
  onMessage,
  onAgentJoined,
  onTyping,
  onError,
}: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Use refs for callbacks to avoid re-subscribing on every render
  const onMessageRef = useRef(onMessage);
  const onAgentJoinedRef = useRef(onAgentJoined);
  const onTypingRef = useRef(onTyping);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onAgentJoinedRef.current = onAgentJoined;
    onTypingRef.current = onTyping;
    onErrorRef.current = onError;
  }, [onMessage, onAgentJoined, onTyping, onError]);

  // Subscribe to chat channel
  useEffect(() => {
    if (!enabled) {
      console.log(`[useRealtimeChat] Not subscribing - disabled`, {
        enabled,
        chatId,
      });
      return;
    }

    if (!chatId) {
      console.log(`[useRealtimeChat] Not subscribing - no chatId`, {
        enabled,
        chatId,
      });
      return;
    }

    console.log(`[useRealtimeChat] ✅ Subscribing to chat:${chatId}`, {
      enabled,
      chatId,
      channelName: `chat:${chatId}`,
    });

    // Create channel
    const channel = supabase.channel(`chat:${chatId}`);

    // Listen for messages
    channel.on("broadcast", { event: "message" }, (payload: any) => {
      try {
        const message = payload.payload as RealtimeChatMessage;
        console.log(`[useRealtimeChat] Received message:`, message);

        if (onMessageRef.current) {
          onMessageRef.current(message);
        }
      } catch (err) {
        console.error("[useRealtimeChat] Error handling message:", err);
        const errorMsg = "Failed to process incoming message";
        setError(errorMsg);
        if (onErrorRef.current) {
          onErrorRef.current(errorMsg);
        }
      }
    });

    // Listen for agent joined events
    console.log(
      `[useRealtimeChat] Registering listener for: chat:${chatId}:agent_joined`
    );
    channel.on("broadcast", { event: "agent_joined" }, (payload: any) => {
      try {
        const agentData = payload.payload as {
          agentId: string;
          agentName: string;
          timestamp: Date;
        };
        console.log(
          `[useRealtimeChat] 🎉 Agent joined event received:`,
          agentData
        );

        if (onAgentJoinedRef.current) {
          onAgentJoinedRef.current(agentData);
        }
      } catch (err) {
        console.error("[useRealtimeChat] Error handling agent_joined:", err);
      }
    });

    // Listen for typing indicators
    channel.on("broadcast", { event: "typing" }, (payload: any) => {
      try {
        const typingData = payload.payload as {
          userId: string;
          isTyping: boolean;
        };
        console.log(`[useRealtimeChat] Typing indicator:`, typingData);

        if (onTypingRef.current) {
          onTypingRef.current(typingData.userId, typingData.isTyping);
        }
      } catch (err) {
        console.error("[useRealtimeChat] Error handling typing:", err);
      }
    });

    // Subscribe to channel (Real Supabase uses callback)
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        console.log(
          `[useRealtimeChat] ✅ Successfully subscribed to channel: chat:${chatId}`,
          {
            isConnected: true,
            channelName: `chat:${chatId}`,
            status,
          }
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[useRealtimeChat] ❌ Channel error for chat:${chatId}`);
        setIsConnected(false);
      } else if (status === "TIMED_OUT") {
        console.error(
          `[useRealtimeChat] ⏱️ Subscription timed out for chat:${chatId}`
        );
        setIsConnected(false);
      } else {
        console.log(`[useRealtimeChat] Channel status: ${status}`);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log(`[useRealtimeChat] Unsubscribing from chat:${chatId}`);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, chatId]); // Remove callbacks from deps - using refs instead

  // Send message function
  const sendMessage = useCallback(
    async (
      content: string,
      role: "USER" | "ASSISTANT" | "AGENT"
    ): Promise<boolean> => {
      if (!chatId) {
        setError("No chat ID provided");
        return false;
      }

      if (!content.trim()) {
        setError("Message content cannot be empty");
        return false;
      }

      try {
        console.log(`[useRealtimeChat] Sending message to chat:${chatId}`, {
          role,
        });

        // Call API to save message to database
        const response = await fetch(`/api/chats/${chatId}/messages/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content.trim(),
            role: role,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        const data = await response.json();
        console.log(`[useRealtimeChat] Message saved to DB:`, data.message.id);

        // Broadcast the message via Supabase Realtime
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "message",
            payload: {
              id: data.message.id,
              content: data.message.content,
              role: data.message.role.toLowerCase(),
              timestamp: data.message.createdAt,
              sender: data.message.sender,
            },
          });
          console.log(
            `[useRealtimeChat] 📢 Broadcasted message via Supabase Realtime`
          );
        }

        setError(null);
        return true;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to send message";
        console.error("[useRealtimeChat] Error sending message:", err);
        setError(errorMsg);

        if (onErrorRef.current) {
          onErrorRef.current(errorMsg);
        }

        return false;
      }
    },
    [chatId]
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !enabled) {
        return;
      }

      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: "current-user", // Will be replaced with actual user ID
          isTyping,
        },
      });
    },
    [enabled]
  );

  // Broadcast agent joined event
  const broadcastAgentJoined = useCallback(
    (agentId: string, agentName: string) => {
      if (!channelRef.current || !enabled) {
        console.warn(
          "[useSupabaseRealtimeChat] Cannot broadcast agent_joined: not connected"
        );
        return;
      }

      console.log(`[useSupabaseRealtimeChat] Broadcasting agent_joined:`, {
        agentId,
        agentName,
      });

      channelRef.current.send({
        type: "broadcast",
        event: "agent_joined",
        payload: {
          agentId,
          agentName,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [enabled]
  );

  return {
    sendMessage,
    sendTypingIndicator,
    broadcastAgentJoined,
    isConnected,
    error,
  };
}
