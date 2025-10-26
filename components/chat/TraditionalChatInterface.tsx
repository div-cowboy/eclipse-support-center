"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    status?: "pending" | "resolved" | "escalated";
    priority?: "low" | "medium" | "high" | "urgent";
    assignedTo?: string;
  };
}

interface DatabaseMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface TraditionalChat {
  id: string;
  title: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  _count: {
    messages: number;
  };
}

interface TraditionalChatInterfaceProps {
  chatId?: string;
  className?: string;
}

export function TraditionalChatInterface({
  chatId,
  className = "",
}: TraditionalChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState<TraditionalChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat info on mount if chatId is provided
  useEffect(() => {
    if (chatId) {
      const loadChatInfo = async () => {
        try {
          const response = await fetch(`/api/chats/${chatId}`);
          if (response.ok) {
            const data = await response.json();
            setChatInfo(data);
            // Map database message roles (uppercase) to frontend format (lowercase)
            const mappedMessages = (data.messages || []).map(
              (msg: DatabaseMessage) => ({
                ...msg,
                role: msg.role.toLowerCase() as "user" | "assistant" | "system",
                timestamp: new Date(msg.createdAt),
              })
            );
            setMessages(mappedMessages);
          }
        } catch (error) {
          console.error("Error loading chat info:", error);
        }
      };

      loadChatInfo();
    }
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          chatId: chatId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update chat info if this is a new chat
        if (!chatId && data.chat) {
          setChatInfo(data.chat);
        }

        // Add the assistant's response
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content:
            data.response ||
            "Thank you for your message. A support agent will respond shortly.",
          timestamp: new Date(),
          metadata: {
            status: "pending",
            priority: "medium",
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "system",
        content:
          "Sorry, I encountered an error. Please try again or contact support directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "escalated":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "escalated":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  return (
    <Card className={`h-[600px] flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {chatInfo?.title || "Support Chat"}
          {chatInfo && (
            <div className="flex gap-2 ml-auto">
              <Badge variant="outline" className="text-xs">
                {chatInfo._count?.messages || 0} messages
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${getStatusColor(chatInfo.status)}`}
              >
                {chatInfo.status}
              </Badge>
            </div>
          )}
        </CardTitle>
        {chatInfo?.description && (
          <p className="text-sm text-muted-foreground">
            {chatInfo.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !chatId && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Start a conversation
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Send us a message and our support team will get back to you as
                soon as possible.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Left Avatar for Assistant/System messages */}
              {(message.role === "assistant" || message.role === "system") && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      CS
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1 max-w-[70%]">
                {/* Sender Label */}
                <span className="text-xs text-muted-foreground px-1">
                  {message.role === "user"
                    ? "User"
                    : message.role === "assistant"
                    ? "Customer Support"
                    : "System"}
                </span>

                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.role === "system"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>

                  {/* Message metadata */}
                  {message.metadata && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      {message.metadata.status && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.metadata.status)}
                          <span className="capitalize">
                            {message.metadata.status}
                          </span>
                        </div>
                      )}
                      {message.metadata.priority && (
                        <Badge variant="outline" className="text-xs">
                          {message.metadata.priority}
                        </Badge>
                      )}
                      {message.metadata.assignedTo && (
                        <span className="text-muted-foreground">
                          Assigned to: {message.metadata.assignedTo}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp
                      ? message.timestamp.toLocaleTimeString()
                      : new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Right Avatar for User messages */}
              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
                    <span className="text-sm font-semibold text-white dark:text-black">
                      U
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
