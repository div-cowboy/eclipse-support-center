"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardHeader } from "@/components/shadcn/ui/card";
import { MessageSquare, Plus, Trash2, Clock, X } from "lucide-react";
import {
  getChatSessions,
  deleteChatSession,
  updateChatSession,
  type ChatSession,
} from "@/lib/embed-chat-storage";
import { useRealtimeChatList } from "../hooks/useRealtimeChatList";
import type { ChatListMessage } from "../hooks/useRealtimeChatList";

interface EmbedChatsListProps {
  chatbotId: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onClose?: () => void;
  chatbotInfo?: {
    name: string;
    description?: string;
  };
}

export function EmbedChatsList({
  chatbotId,
  onSelectChat,
  onNewChat,
  onClose,
}: EmbedChatsListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    const chatSessions = getChatSessions(chatbotId);

    // Calculate unread status for each session
    const sessionsWithUnread = chatSessions.map((session) => {
      // If never viewed, don't show as unread (they haven't interacted yet)
      if (!session.lastViewedAt) {
        return { ...session, unreadCount: 0 };
      }

      // Calculate if there are unread messages
      const lastViewed = new Date(session.lastViewedAt);
      const lastMessage = new Date(session.lastMessageAt);
      const hasUnread = lastMessage > lastViewed;

      return {
        ...session,
        unreadCount: hasUnread ? 1 : 0,
      };
    });

    // Fetch actual last messages for sessions with generic previews
    const sessionsToUpdate = sessionsWithUnread.filter(
      (session) =>
        !session.preview ||
        session.preview === "New conversation" ||
        session.preview === "Recent message" ||
        session.preview === "New message received"
    );

    // Update previews from API
    for (const session of sessionsToUpdate) {
      try {
        const response = await fetch(`/api/embed/chats/${session.id}`);
        if (response.ok) {
          const chatData = await response.json();
          const messages = chatData.messages || [];
          if (messages.length > 0) {
            // Messages are ordered by createdAt asc, so last one is most recent
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.content) {
              const preview =
                lastMessage.content.length > 60
                  ? lastMessage.content.substring(0, 60) + "..."
                  : lastMessage.content;
              updateChatSession(session.id, { preview });
              // Update local session
              const index = sessionsWithUnread.findIndex(
                (s) => s.id === session.id
              );
              if (index >= 0) {
                sessionsWithUnread[index].preview = preview;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching preview for chat ${session.id}:`, error);
      }
    }

    setSessions(sessionsWithUnread);
  }, [chatbotId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Handle incoming messages from background chats
  const handleBackgroundMessage = useCallback(
    (message: ChatListMessage) => {
      console.log("[EmbedChatsList] Background message received:", {
        chatId: message.chatId,
        role: message.role,
        sender: message.senderName,
      });

      // Only track messages from assistant/agent (not user's own messages)
      if (message.role === "assistant" || message.role === "agent") {
        // Update localStorage with new message timestamp
        updateChatSession(message.chatId, {
          lastMessageAt: message.timestamp.toISOString(),
          preview: `${message.senderName}: ${message.content.substring(
            0,
            50
          )}...`,
        });

        // Reload sessions to update UI
        loadSessions();
      }
    },
    [loadSessions]
  );

  // Subscribe to real-time updates for all user's chats
  const chatIds = sessions.map((s) => s.id);
  useRealtimeChatList({
    chatIds,
    enabled: chatIds.length > 0,
    onMessageReceived: handleBackgroundMessage,
  });

  const handleDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelectChat

    if (confirm("Are you sure you want to delete this chat?")) {
      setDeletingId(chatId);
      deleteChatSession(chatId);
      loadSessions();
      setTimeout(() => setDeletingId(null), 300);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="pb-3 px-4 flex-shrink-0 border-b border-[#E0E0E0]">
        {/* Simplified Header with Flexbox Layout */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back Button */}
          <div className="flex-shrink-0">
            <div className="h-8 w-8" />
          </div>

          {/* Center: Title */}
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-lg font-semibold">Chats</h2>
          </div>

          {/* Right: Close Button */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
            >
              <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {/* Chats List - Scrollable */}
        <div className="flex-1 overflow-y-auto scroll-smooth pb-20">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No chats yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-4">
                Start a new conversation to get help from our AI assistant.
              </p>
              <Button onClick={onNewChat} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Start Your First Chat
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer border-[#E0E0E0] transition-colors group relative ${
                    deletingId === session.id ? "opacity-50" : ""
                  }`}
                  onClick={() => onSelectChat(session.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Unread indicator */}
                      {(session.unreadCount || 0) > 0 && (
                        <div className="absolute top-4 right-12">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        </div>
                      )}

                      {/* First line: Truncated last message */}
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        {session.preview || "New conversation"}
                      </p>

                      {/* Second line: Time */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(session.lastMessageAt)}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(session.id, e)}
                      disabled={deletingId === session.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Chat Button - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center items-center bg-background  flex-shrink-0">
          <Button
            onClick={onNewChat}
            className="w-auto max-w-[120px] gap-0 mx-auto bg-black rounded-full text-white hover:bg-black/90 transition-all duration-300"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
