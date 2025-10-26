"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Bot, Plus } from "lucide-react";
import { ChatbotChatsAccordion } from "@/components/chat/ChatbotChatsAccordion";

// Chatbot type based on Prisma schema
interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  config?: any;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    chats: number;
    contextBlocks: number;
  };
}

function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Bot className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No chatbots yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Create your first chatbot to start having conversations and building a
        knowledge base.
      </p>
      <Button onClick={() => router.push("/app/chatbots/new")}>
        <Plus className="h-4 w-4 mr-2" />
        Create Chatbot
      </Button>
    </div>
  );
}

export default function ChatsPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Chats</h1>
          <p className="text-muted-foreground">
            Access your chatbots and their recent conversations. Click to expand
            and view recent chats.
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
        <EmptyState />
      ) : (
        <ChatbotChatsAccordion
          chatbots={chatbots}
          onStartChat={handleStartChat}
        />
      )}
    </div>
  );
}
