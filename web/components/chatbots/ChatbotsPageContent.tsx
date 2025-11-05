"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Plus } from "lucide-react";
import { ChatbotChatsAccordion } from "@/components/chat/ChatbotChatsAccordion";
import { ChatbotsEmptyState } from "./ChatbotsEmptyState";

interface ChatbotConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  maxSources?: number;
  includeOrganizationDocs?: boolean;
  includeContextBlocks?: boolean;
  coreRules?: Record<string, unknown>;
}

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  config?: ChatbotConfig;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    chats: number;
    contextBlocks: number;
  };
}

export function ChatbotsPageContent() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatbots = async () => {
      try {
        const response = await fetch("/api/chatbots");
        if (response.ok) {
          const data = await response.json();
          setChatbots(data);
        } else {
          console.error("Failed to fetch chatbots");
        }
      } catch (error) {
        console.error("Error fetching chatbots:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatbots();
  }, []);

  const handleStartChat = (chatbotId: string) => {
    window.open(`/app/chatbots/${chatbotId}/chat`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chatbots</h1>
          <p className="text-muted-foreground">
            Manage your AI chatbots and their conversations. Click to expand and
            view recent chats.
          </p>
        </div>
        <Button onClick={() => router.push("/app/chatbots/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Chatbot
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading chatbots...</div>
        </div>
      ) : chatbots.length === 0 ? (
        <ChatbotsEmptyState />
      ) : (
        <ChatbotChatsAccordion
          chatbots={chatbots}
          onStartChat={handleStartChat}
        />
      )}
    </div>
  );
}

