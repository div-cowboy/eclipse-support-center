import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Message notification for chat list
 */
export interface ChatListMessage {
  chatId: string;
  messageId: string;
  content: string;
  role: "user" | "assistant" | "agent" | "system";
  timestamp: Date;
  senderId: string;
  senderName: string;
}

interface UseRealtimeChatListOptions {
  chatIds: string[];
  enabled: boolean;
  onMessageReceived?: (message: ChatListMessage) => void;
}

/**
 * Hook for listening to multiple chats in the background (for chat list view)
 * Subscribes to real-time updates for all user's chats to detect incoming messages
 */
export function useRealtimeChatList({
  chatIds,
  enabled,
  onMessageReceived,
}: UseRealtimeChatListOptions) {
  const channelsRef = useRef<Map<string, any>>(new Map());
  const onMessageReceivedRef = useRef(onMessageReceived);

  // Update ref when callback changes
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  // Subscribe to all chat channels
  useEffect(() => {
    if (!enabled || chatIds.length === 0) {
      console.log("[useRealtimeChatList] Not subscribing", {
        enabled,
        chatCount: chatIds.length,
      });
      return;
    }

    console.log(
      `[useRealtimeChatList] 📋 Subscribing to ${chatIds.length} chats`,
      chatIds
    );

    const channels = new Map<string, any>();

    // Subscribe to each chat
    chatIds.forEach((chatId) => {
      const channel = supabase.channel(`chat:${chatId}`);

      // Listen for messages
      channel.on("broadcast", { event: "message" }, (payload: any) => {
        try {
          const message = payload.payload as {
            id: string;
            content: string;
            role: string;
            timestamp: Date;
            sender: {
              id: string;
              name: string;
            };
          };

          console.log(
            `[useRealtimeChatList] 📨 Message received on chat:${chatId}`,
            {
              messageId: message.id,
              role: message.role,
              sender: message.sender.name,
            }
          );

          const chatListMessage: ChatListMessage = {
            chatId,
            messageId: message.id,
            content: message.content,
            role: message.role as "user" | "assistant" | "agent" | "system",
            timestamp: new Date(message.timestamp),
            senderId: message.sender.id,
            senderName: message.sender.name,
          };

          if (onMessageReceivedRef.current) {
            onMessageReceivedRef.current(chatListMessage);
          }
        } catch (err) {
          console.error(
            `[useRealtimeChatList] Error handling message on chat:${chatId}`,
            err
          );
        }
      });

      // Subscribe
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[useRealtimeChatList] ✅ Subscribed to chat:${chatId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            `[useRealtimeChatList] ❌ Channel error for chat:${chatId}`
          );
        }
      });

      channels.set(chatId, channel);
    });

    channelsRef.current = channels;

    // Cleanup
    return () => {
      console.log(
        `[useRealtimeChatList] 🧹 Unsubscribing from ${channels.size} chats`
      );
      channels.forEach((channel, chatId) => {
        console.log(`[useRealtimeChatList] Unsubscribing from chat:${chatId}`);
        channel.unsubscribe();
      });
      channelsRef.current.clear();
    };
  }, [enabled, chatIds.join(",")]); // Use join to detect array changes

  return {
    subscribedCount: channelsRef.current.size,
  };
}
