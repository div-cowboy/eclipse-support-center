"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  useAccordion,
} from "@/components/ui/accordion";
import { Button } from "@/components/shadcn/ui/button";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Bot,
  MessageSquare,
  MessageCircle,
  Clock,
  ChevronRight,
  Plus,
  Settings,
} from "lucide-react";

interface Chat {
  id: string;
  title: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdAt: Date;
  updatedAt: Date;
  _count: {
    messages: number;
  };
}

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
  _count: {
    chats: number;
    contextBlocks: number;
  };
}

interface ChatbotChatsAccordionProps {
  chatbots: Chatbot[];
  onStartChat?: (chatbotId: string) => void;
}

function ChatbotAccordionItem({
  chatbot,
  onStartChat,
}: {
  chatbot: Chatbot;
  onStartChat?: (chatbotId: string) => void;
}) {
  const router = useRouter();
  const { openItems, toggleItem } = useAccordion();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const isOpen = openItems.includes(chatbot.id);

  // Fetch chats when accordion opens
  useEffect(() => {
    if (isOpen && chats.length === 0) {
      fetchChats();
    }
  }, [isOpen, chatbot.id]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/chatbots/${chatbot.id}/chats?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      } else {
        console.error("Failed to fetch chats");
        setChats([]);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);
    const diffInHours = Math.floor(
      (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleStartChat = () => {
    if (onStartChat) {
      onStartChat(chatbot.id);
    } else {
      window.open(`/app/chatbots/${chatbot.id}/chat`, "_blank");
    }
  };

  return (
    <AccordionItem>
      <AccordionTrigger
        onClick={() => toggleItem(chatbot.id)}
        isOpen={isOpen}
        className="hover:bg-muted/50"
      >
        <div className="flex items-center justify-between w-full mr-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <h3 className="font-semibold">{chatbot.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {chatbot.description || "No description"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={`${getStatusColor(chatbot.status)} text-xs`}>
              {chatbot.status}
            </Badge>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{chatbot._count?.chats || 0}</span>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/app/chatbots/${chatbot.id}/edit`);
                }}
                className="h-8 px-3 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer transition-colors"
              >
                <Settings className="h-4 w-4" />
                Edit
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartChat();
                }}
                className="h-8 px-3 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Start Chat
              </div>
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent isOpen={isOpen}>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-muted-foreground">
                Loading chats...
              </div>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No chats yet</p>
              <Button variant="outline" size="sm" onClick={handleStartChat}>
                <Plus className="h-4 w-4 mr-1" />
                Start First Chat
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Recent Chats ({chats.length})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/app/chatbots/${chatbot.id}`)}
                  className="text-xs"
                >
                  View All
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="space-y-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() =>
                      window.open(
                        `/app/chatbots/${chatbot.id}/chat?chatId=${chat.id}`,
                        "_blank"
                      )
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium truncate">
                        {chat.title}
                      </h5>
                      {chat.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{chat._count?.messages || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(chat.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ChatbotChatsAccordion({
  chatbots,
  onStartChat,
}: ChatbotChatsAccordionProps) {
  if (chatbots.length === 0) {
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
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {chatbots.map((chatbot) => (
        <ChatbotAccordionItem
          key={chatbot.id}
          chatbot={chatbot}
          onStartChat={onStartChat}
        />
      ))}
    </Accordion>
  );
}
