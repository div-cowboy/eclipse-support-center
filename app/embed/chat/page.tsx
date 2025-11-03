"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClipLoader } from "react-spinners";
import { UniversalChatInterface } from "@/components/chat/UniversalChatInterface";
import { EmbedChatsList } from "@/components/chat/EmbedChatsList";
import {
  saveChatSession,
  updateChatSession,
  isStorageAvailable,
  markChatAsViewed,
} from "@/lib/embed-chat-storage";
import type { ChatConfig } from "@/components/chat/UniversalChatInterface";

interface EmbedConfig {
  organizationId?: string;
  chatbotId?: string;
  theme?: "light" | "dark" | "auto";
  primaryColor?: string;
  borderRadius?: string;
  height?: string;
  width?: string;
  showBranding?: boolean;
  welcomeMessage?: string;
  placeholder?: string;
  autoSendFirstMessage?: string; // Display this message as an assistant message when chat opens (NO API call, appears on support rep side)
  customCSS?: string;
  fontFamily?: string;
  fontSize?: string;
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function EmbedChatContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "chat">("list");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatbotInfo, setChatbotInfo] = useState<{
    name?: string;
    description?: string;
    [key: string]: unknown;
  } | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false); // Track escalation state

  // Parse configuration from URL parameters
  const config: EmbedConfig = {
    organizationId: searchParams.get("organizationId") || undefined,
    chatbotId: searchParams.get("chatbotId") || undefined,
    theme: (searchParams.get("theme") as "light" | "dark" | "auto") || "auto",
    primaryColor: searchParams.get("primaryColor") || undefined,
    borderRadius: searchParams.get("borderRadius") || "8px",
    // height: searchParams.get("height") || "600px",
    width: searchParams.get("width") || "100%",
    showBranding: searchParams.get("showBranding") !== "false",
    welcomeMessage: searchParams.get("welcomeMessage") || undefined,
    placeholder: searchParams.get("placeholder") || "Type your message...",
    autoSendFirstMessage: searchParams.get("autoSendFirstMessage") || undefined,
    customCSS: searchParams.get("customCSS") || undefined,
    fontFamily: searchParams.get("fontFamily") || undefined,
    fontSize: searchParams.get("fontSize") || undefined,
  };

  // Log parsed config
  useEffect(() => {
    console.log("[EmbedChat] 📥 Parsed config from URL:", {
      chatbotId: config.chatbotId,
      autoSendFirstMessage: config.autoSendFirstMessage,
      welcomeMessage: config.welcomeMessage,
      placeholder: config.placeholder,
      showBranding: config.showBranding,
      allParams: Object.fromEntries(searchParams.entries()),
    });
  }, [
    config.chatbotId,
    config.autoSendFirstMessage,
    config.welcomeMessage,
    searchParams,
  ]);

  // Check if localStorage is available
  useEffect(() => {
    setStorageAvailable(isStorageAvailable());
  }, []);

  // Mark chat as viewed when chatId changes (including initial load)
  useEffect(() => {
    if (storageAvailable && chatId && view === "chat") {
      markChatAsViewed(chatId);
    }
  }, [storageAvailable, chatId, view]);

  // Load chatbot info on mount
  useEffect(() => {
    const loadChatbotInfo = async () => {
      if (!config.chatbotId) return;

      try {
        const response = await fetch(`/api/embed/chatbots/${config.chatbotId}`);
        if (response.ok) {
          const data = await response.json();
          setChatbotInfo(data);
        }
      } catch (error) {
        console.error("Error loading chatbot info:", error);
      }
    };

    loadChatbotInfo();
  }, [config.chatbotId]);

  // Navigation handlers (useCallback to prevent recreating on every render)
  const handleSelectChat = useCallback(
    async (selectedChatId: string) => {
      setChatId(selectedChatId);
      setView("chat");

      // Mark chat as viewed when opening it
      if (storageAvailable) {
        markChatAsViewed(selectedChatId);
      }

      // Check if this chat is already escalated
      try {
        const response = await fetch(`/api/embed/chats/${selectedChatId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.escalationRequested) {
            setIsEscalated(true);
            console.log(
              "[EmbedChat] Loaded escalated chat, setting isEscalated to true"
            );
          } else {
            setIsEscalated(false);
          }
        }
      } catch (error) {
        console.error("Error checking chat escalation status:", error);
      }
    },
    [storageAvailable]
  );

  const handleNewChat = useCallback(() => {
    setChatId(null);
    setIsEscalated(false); // Reset escalation state for new chat
    setView("chat");
  }, []);

  const handleBackToList = useCallback(() => {
    setView("list");
  }, []);

  const handleClose = useCallback(() => {
    // Send message to parent window to close the widget
    if (window.parent !== window) {
      window.parent.postMessage({ type: "eclipse-chat-close" }, "*");
    }
  }, []);

  const handleChatCreated = useCallback(
    (newChatId: string) => {
      console.log(
        "[EmbedChat] Chat created - updating chatId state:",
        newChatId
      );
      setChatId(newChatId);

      // Save new chat session to localStorage
      if (storageAvailable && config.chatbotId) {
        saveChatSession({
          id: newChatId,
          chatbotId: config.chatbotId,
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          messageCount: 1,
          preview: "New conversation",
        });
      }
    },
    [storageAvailable, config.chatbotId]
  );

  const handleEscalationRequested = useCallback(
    async (reason: string) => {
      console.log("[EmbedChat] 🚨 ESCALATION REQUESTED CALLBACK:", {
        reason,
        chatbotId: config.chatbotId,
        chatId,
        currentIsEscalated: isEscalated,
      });
      // Log escalation to backend
      try {
        const response = await fetch("/api/escalations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatbotId: config.chatbotId,
            chatId: chatId,
            reason: reason,
            messages: [], // We don't have access to messages here, but the backend can fetch them
            timestamp: new Date().toISOString(),
            isEmbedded: true,
          }),
        });

        console.log("[EmbedChat] 📡 Escalation API response:", {
          ok: response.ok,
          status: response.status,
        });

        // Mark as escalated to enable real-time mode
        setIsEscalated(true);
        console.log(
          "[EmbedChat] ✅ Escalation completed, enabling real-time mode:",
          {
            isEscalated: true,
            chatId,
            realtimeMode: true,
          }
        );
      } catch (error) {
        console.error("[EmbedChat] ❌ Error logging escalation:", error);
      }
    },
    [config.chatbotId, chatId, isEscalated]
  );

  const handleMessageSent = useCallback(
    (message: { content: string; role: string }) => {
      console.log("[EmbedChat] Message sent:", {
        chatId,
        isEscalated,
        message,
      });

      // Update chat session in localStorage after successful message
      if (storageAvailable && chatId && config.chatbotId) {
        const now = new Date().toISOString();
        // Truncate message content for preview
        const preview =
          message.content.length > 60
            ? message.content.substring(0, 60) + "..."
            : message.content;

        updateChatSession(chatId, {
          lastMessageAt: now,
          messageCount: 1, // This will be incremented by the backend
          preview: preview,
          // Mark as viewed since user is actively in the chat
          lastViewedAt: now,
        });
      }
    },
    [chatId, isEscalated, storageAvailable, config.chatbotId]
  );

  const handleMessageReceived = useCallback(
    (message: { content: string; role: string }) => {
      console.log("[EmbedChat] Message received:", {
        chatId,
        isEscalated,
        view,
        message,
      });

      // Update chat session in localStorage when AI/agent responds
      if (storageAvailable && chatId && config.chatbotId) {
        const now = new Date().toISOString();
        // Truncate message content for preview
        const preview =
          message.content.length > 60
            ? message.content.substring(0, 60) + "..."
            : message.content;

        // If user is actively viewing this chat, mark as viewed
        // Otherwise, only update lastMessageAt (will show as unread)
        if (view === "chat") {
          updateChatSession(chatId, {
            lastMessageAt: now,
            preview: preview,
            lastViewedAt: now, // Mark as viewed since user is watching
          });
        } else {
          updateChatSession(chatId, {
            lastMessageAt: now,
            preview: preview,
            // Don't update lastViewedAt - user isn't viewing this chat
          });
        }
      }
    },
    [chatId, isEscalated, storageAvailable, config.chatbotId, view]
  );

  // Log current state for debugging
  useEffect(() => {
    console.log("[EmbedChat] 🔄 State changed:", {
      chatId,
      isEscalated,
      realtimeModeEnabled: isEscalated && !!chatId,
      view,
      configEscalation: !isEscalated,
      autoSendFirstMessage: config.autoSendFirstMessage,
      welcomeMessage: config.welcomeMessage,
    });
  }, [
    chatId,
    isEscalated,
    view,
    config.autoSendFirstMessage,
    config.welcomeMessage,
  ]);

  // Create universal chat config (memoized to prevent unnecessary re-renders)
  const chatConfig: ChatConfig = useMemo(() => {
    console.log("[EmbedChat] 📋 Creating chat config:", {
      chatId,
      isEscalated,
      realtimeMode: isEscalated && !!chatId,
      escalationFeature: !isEscalated,
      autoSendFirstMessage: config.autoSendFirstMessage,
      welcomeMessage: config.welcomeMessage,
      chatbotId: config.chatbotId,
      view,
    });

    return {
      apiEndpoint: `/api/embed/chatbots/${config.chatbotId}/chat`,
      type: "embed",
      chatbotId: config.chatbotId,
      chatId: chatId || undefined,
      title: chatbotInfo?.name || "AI Assistant",
      description: chatbotInfo?.description,
      placeholder: isEscalated
        ? "Message support agent..."
        : config.placeholder,
      welcomeMessage: config.welcomeMessage,
      autoSendFirstMessage: config.autoSendFirstMessage,
      height: config.height,
      className: "h-full border-0 shadow-none",
      features: {
        streaming: true,
        escalation: !isEscalated, // Hide escalation button once escalated
        multiChat: storageAvailable,
        realtimeMode: isEscalated && !!chatId, // Enable real-time mode after escalation
        showBranding: config.showBranding,
        showSources: false, // Hide sources in embed by default
        showTokens: false, // Hide tokens in embed by default
      },
      styling: {
        primaryColor: config.primaryColor,
        borderRadius: config.borderRadius,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        customCSS: config.customCSS,
      },
      onChatCreated: handleChatCreated,
      onEscalationRequested: handleEscalationRequested,
      onMessageSent: handleMessageSent,
      onMessageReceived: handleMessageReceived,
      onBackToList: handleBackToList,
      onClose: handleClose,
    };
  }, [
    chatId,
    isEscalated,
    config.chatbotId,
    config.placeholder,
    config.primaryColor,
    config.borderRadius,
    config.fontFamily,
    config.fontSize,
    config.customCSS,
    config.welcomeMessage,
    config.autoSendFirstMessage,
    config.height,
    config.showBranding,
    chatbotInfo?.name,
    chatbotInfo?.description,
    storageAvailable,
    handleChatCreated,
    handleEscalationRequested,
    handleMessageSent,
    handleMessageReceived,
    handleBackToList,
    handleClose,
  ]);

  // Apply custom styling based on configuration
  const containerStyle: React.CSSProperties = {
    height: config.height,
    width: config.width,
    borderRadius: config.borderRadius,
    ...(config.fontFamily && { fontFamily: config.fontFamily }),
    ...(config.fontSize && { fontSize: config.fontSize }),
    ...(config.primaryColor && {
      "--primary": config.primaryColor,
      "--primary-foreground": "#ffffff",
    }),
  };

  // Show list view
  if (view === "list") {
    return (
      <>
        {/* Custom CSS injection */}
        {config.customCSS && (
          <style
            dangerouslySetInnerHTML={{
              __html: decodeURIComponent(config.customCSS),
            }}
          />
        )}
        <div
          className="h-screen w-full bg-background flex flex-col"
          style={containerStyle}
        >
          <EmbedChatsList
            chatbotId={config.chatbotId || ""}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onClose={handleClose}
            chatbotInfo={
              chatbotInfo && chatbotInfo.name
                ? {
                    name: chatbotInfo.name,
                    description: chatbotInfo.description as string | undefined,
                  }
                : undefined
            }
          />
        </div>
      </>
    );
  }

  // Show chat view
  return (
    <>
      {/* Custom CSS injection */}
      {config.customCSS && (
        <style
          dangerouslySetInnerHTML={{
            __html: decodeURIComponent(config.customCSS),
          }}
        />
      )}
      <div
        className="h-screen w-full bg-background flex flex-col"
        style={containerStyle}
      >
        <UniversalChatInterface config={chatConfig} />
      </div>
    </>
  );
}

// Loading fallback component
function EmbedChatLoading() {
  return (
    <div className="h-screen w-full bg-background">
      <div className="h-full flex flex-col border-0 shadow-none">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipLoader
              color="hsl(var(--primary))"
              size={40}
              className="mb-4"
            />
            <h3 className="text-lg font-semibold mb-2">Loading chat...</h3>
            <p className="text-muted-foreground max-w-sm">
              Please wait while we set up your conversation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function EmbedChatPage() {
  return (
    <Suspense fallback={<EmbedChatLoading />}>
      <EmbedChatContent />
    </Suspense>
  );
}
