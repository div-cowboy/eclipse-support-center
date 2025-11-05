"use client";

import { useState } from "react";
import { UniversalChatInterface } from "@/components/chat/UniversalChatInterface";
import type { ChatConfig } from "@/components/chat/UniversalChatInterface";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const [chatId, setChatId] = useState<string | null>(null);

  const { id } = useParams();
  const chatbotId = id as string | undefined;
  const chatConfig: ChatConfig = {
    apiEndpoint: `/api/chatbots/${id}/chat`,
    type: "chatbot",
    chatbotId: chatbotId || "",
    chatId: chatId || undefined,
    welcomeMessage: "Hi, how can I help you today?",
    placeholder: "Ask a question...",
    className: "h-[600px]",
    features: {
      streaming: true,
      // escalation is always enabled - built-in feature
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
