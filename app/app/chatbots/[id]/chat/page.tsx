"use client";

import { useState } from "react";
import { UniversalChatInterface } from "@/components/chat/UniversalChatInterface";
import type { ChatConfig } from "@/components/chat/UniversalChatInterface";

export default function ChatPage({ params }: { params: { id: string } }) {
  const [chatId, setChatId] = useState<string | null>(null);

  const chatConfig: ChatConfig = {
    apiEndpoint: `/api/chatbots/${params.id}/chat`,
    type: "chatbot",
    chatbotId: params.id,
    chatId: chatId || undefined,
    welcomeMessage: "Hi, how can I help you today?",
    placeholder: "Ask a question...",
    className: "h-[600px]",
    features: {
      streaming: true,
      escalation: true,
      debugMode: true,
      contextBlocks: true,
      multiChat: false,
      supportView: false,
      realtimeMode: false, // Will be enabled after escalation
      showBranding: false,
      showSources: true,
      showTokens: true,
      showStatus: false,
      showPriority: false,
      showAssignedTo: false,
    },
    onChatCreated: (newChatId: string) => {
      setChatId(newChatId);
      console.log("Chat created:", newChatId);
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat with Bot</h1>
          <p className="text-muted-foreground">
            Ask questions and get answers based on your organization&apos;s
            knowledge base
          </p>
        </div>
      </div>

      <UniversalChatInterface config={chatConfig} />
    </div>
  );
}
