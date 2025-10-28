"use client";

import { UniversalChatInterface } from "./UniversalChatInterface";
import type { ChatConfig } from "./UniversalChatInterface";

interface TraditionalChatInterfaceProps {
  chatId?: string;
  className?: string;
  isSupportView?: boolean; // If true, messages are sent as ASSISTANT (support agent)
}

export function TraditionalChatInterface({
  chatId,
  className = "",
  isSupportView = false,
}: TraditionalChatInterfaceProps) {
  const chatConfig: ChatConfig = {
    apiEndpoint: "/api/chats",
    type: "traditional",
    chatId: chatId,
    title: "Support Chat",
    placeholder: isSupportView
      ? "Type your response as support agent..."
      : "Type your response (AI bot mode)...",
    className: `h-[600px] ${className}`,
    features: {
      streaming: false,
      escalation: false,
      debugMode: false,
      contextBlocks: false,
      multiChat: false,
      supportView: isSupportView,
      showBranding: false,
      showSources: false,
      showTokens: false,
      showStatus: true,
      showPriority: true,
      showAssignedTo: true,
    },
  };

  return <UniversalChatInterface config={chatConfig} />;
}
