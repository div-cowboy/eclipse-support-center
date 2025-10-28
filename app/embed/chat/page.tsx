"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UniversalChatInterface } from "@/components/chat/UniversalChatInterface";
import { EmbedChatsList } from "@/components/chat/EmbedChatsList";
import {
  saveChatSession,
  updateChatSession,
  isStorageAvailable,
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
  customCSS?: string;
  fontFamily?: string;
  fontSize?: string;
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function EmbedChatContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "chat">("list");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatbotInfo, setChatbotInfo] = useState<any>(null);
  const [storageAvailable, setStorageAvailable] = useState(false);

  // Parse configuration from URL parameters
  const config: EmbedConfig = {
    organizationId: searchParams.get("organizationId") || undefined,
    chatbotId: searchParams.get("chatbotId") || undefined,
    theme: (searchParams.get("theme") as "light" | "dark" | "auto") || "auto",
    primaryColor: searchParams.get("primaryColor") || undefined,
    borderRadius: searchParams.get("borderRadius") || "8px",
    height: searchParams.get("height") || "600px",
    width: searchParams.get("width") || "100%",
    showBranding: searchParams.get("showBranding") !== "false",
    welcomeMessage: searchParams.get("welcomeMessage") || undefined,
    placeholder: searchParams.get("placeholder") || "Type your message...",
    customCSS: searchParams.get("customCSS") || undefined,
    fontFamily: searchParams.get("fontFamily") || undefined,
    fontSize: searchParams.get("fontSize") || undefined,
  };

  // Check if localStorage is available
  useEffect(() => {
    setStorageAvailable(isStorageAvailable());
  }, []);

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

  // Navigation handlers
  const handleSelectChat = (selectedChatId: string) => {
    setChatId(selectedChatId);
    setView("chat");
  };

  const handleNewChat = () => {
    setChatId(null);
    setView("chat");
  };

  const handleBackToList = () => {
    setView("list");
  };

  const handleChatCreated = (newChatId: string) => {
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
  };

  const handleEscalationRequested = async (reason: string) => {
    // Log escalation to backend
    try {
      await fetch("/api/escalations", {
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
    } catch (error) {
      console.error("Error logging escalation:", error);
    }
  };

  const handleMessageSent = (message: any) => {
    // Update chat session in localStorage after successful message
    if (storageAvailable && chatId && config.chatbotId) {
      updateChatSession(chatId, {
        lastMessageAt: new Date().toISOString(),
        messageCount: 1, // This will be incremented by the backend
        preview: message.content.slice(0, 100),
      });
    }
  };

  // Create universal chat config
  const chatConfig: ChatConfig = {
    apiEndpoint: `/api/embed/chatbots/${config.chatbotId}/chat`,
    type: "embed",
    chatbotId: config.chatbotId,
    chatId: chatId || undefined,
    title: chatbotInfo?.name || "AI Assistant",
    description: chatbotInfo?.description,
    placeholder: config.placeholder,
    welcomeMessage: config.welcomeMessage,
    height: config.height,
    className: "h-full border-0 shadow-none",
    features: {
      streaming: true,
      escalation: true,
      multiChat: storageAvailable,
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
    onBackToList: handleBackToList,
  };

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
        <div className="h-screen w-full bg-background" style={containerStyle}>
          <EmbedChatsList
            chatbotId={config.chatbotId || ""}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            chatbotInfo={
              chatbotInfo
                ? {
                    name: chatbotInfo.name,
                    description: chatbotInfo.description,
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
      <div className="h-screen w-full bg-background" style={containerStyle}>
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
            <div className="h-12 w-12 text-muted-foreground mb-4">
              Loading...
            </div>
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
