"use client";

import { UniversalChatInterface } from "./UniversalChatInterface";
import type { ChatConfig } from "./UniversalChatInterface";

interface ChatInterfaceProps {
  organizationId: string;
  className?: string;
}

export function ChatInterface({
  organizationId,
  className = "",
}: ChatInterfaceProps) {
  const chatConfig: ChatConfig = {
    apiEndpoint: `/api/organizations/${organizationId}/chat`,
    type: "organization",
    organizationId: organizationId,
    title: "Organization Chat",
    placeholder: "Ask a question about your organization...",
    className: `h-[600px] ${className}`,
    features: {
      streaming: true,
      escalation: false,
      debugMode: false,
      contextBlocks: false,
      multiChat: false,
      supportView: false,
      showBranding: false,
      showSources: true,
      showTokens: true,
      showStatus: false,
      showPriority: false,
      showAssignedTo: false,
    },
  };

  return <UniversalChatInterface config={chatConfig} />;
}
