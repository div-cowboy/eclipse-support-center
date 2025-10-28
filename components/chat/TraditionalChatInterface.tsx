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
  Bot,
  User,
  PhoneCall,
} from "lucide-react";
import { TypingIndicator } from "./TypingIndicator";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
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
  escalationRequested: boolean;
  escalationReason?: string;
  escalationRequestedAt?: Date;
  assignedToId?: string;
  assignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  _count: {
    messages: number;
  };
  chatbot?: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
  };
}

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
                role: msg.role.toLowerCase() as
                  | "user"
                  | "assistant"
                  | "agent"
                  | "system",
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

    // If in support view, the message is from the human support agent (ASSISTANT role)
    // Otherwise, it's from the customer (USER role)
    const messageRole = isSupportView ? "assistant" : "user";

    const newMessage: ChatMessage = {
      id: `${messageRole}_${Date.now()}`,
      role: messageRole,
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
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
          role: isSupportView ? "ASSISTANT" : "USER",
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

        // In support view, don't add an auto-response
        // In customer view, add an AI agent confirmation message
        if (!isSupportView) {
          const agentMessage: ChatMessage = {
            id: `agent_${Date.now()}`,
            role: "agent",
            content:
              data.response ||
              "Thank you for your message. A support agent will respond shortly.",
            timestamp: new Date(),
            metadata: {
              status: "pending",
              priority: "medium",
            },
          };
          setMessages((prev) => [...prev, agentMessage]);
        }
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

  // Determine if this is AI or Human responding
  const isHumanSupport = chatInfo?.assignedToId != null;

  return (
    <Card className={`h-[600px] flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {chatInfo?.title || "Support Chat"}
          {chatInfo && (
            <div className="flex gap-2 ml-auto">
              {/* AI Agent or Human Assistant Indicator */}
              {isHumanSupport ? (
                <Badge variant="default" className="text-xs bg-green-600">
                  <User className="h-3 w-3 mr-1" />
                  Human Assistant
                </Badge>
              ) : chatInfo.chatbot ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Bot className="h-3 w-3 mr-1" />
                  AI Agent
                </Badge>
              ) : null}
              {/* Escalation Indicator */}
              {chatInfo.escalationRequested && !isHumanSupport && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-700 border-amber-300"
                >
                  <PhoneCall className="h-3 w-3 mr-1" />
                  Support Requested
                </Badge>
              )}
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

          {messages.map((message, index) => {
            // Check if this message is where the handoff happens
            // First ASSISTANT message after escalation indicates handoff
            const isHandoffMessage =
              message.role === "assistant" &&
              index > 0 &&
              chatInfo?.escalationRequested &&
              chatInfo?.assignedAt &&
              new Date(message.timestamp) >= new Date(chatInfo.assignedAt) &&
              // Check if this is the first ASSISTANT message
              !messages.slice(0, index).some((m) => m.role === "assistant");

            // Note: Message types are determined by role directly in the rendering logic below

            return (
              <div key={message.id}>
                {/* Show handoff banner when it happens */}
                {isHandoffMessage && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full">
                      <PhoneCall className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        Chat transferred to human support
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* Left Avatar for User messages (Customer) */}
                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 max-w-[70%]">
                    {/* Sender Label */}
                    <span
                      className={`text-xs text-muted-foreground px-1 ${
                        message.role === "user" ? "text-left" : "text-right"
                      }`}
                    >
                      {message.role === "user"
                        ? "Customer"
                        : message.role === "agent"
                        ? "AI Agent"
                        : message.role === "assistant"
                        ? chatInfo?.assignedTo?.name || "Support Agent"
                        : "System"}
                    </span>

                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-muted"
                          : message.role === "system"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          : message.role === "agent"
                          ? "bg-blue-600 text-white"
                          : "bg-green-600 text-white"
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

                      <p
                        className={`text-xs mt-1 ${
                          message.role === "agent"
                            ? "text-blue-100"
                            : message.role === "assistant"
                            ? "text-green-100"
                            : "opacity-70"
                        }`}
                      >
                        {message.timestamp
                          ? message.timestamp.toLocaleTimeString()
                          : new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Right Avatar for Agent/Assistant/System messages (Support) */}
                  {(message.role === "agent" ||
                    message.role === "assistant" ||
                    message.role === "system") && (
                    <div className="flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          message.role === "agent"
                            ? "bg-blue-100 dark:bg-blue-900"
                            : message.role === "assistant"
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-orange-100 dark:bg-orange-900"
                        }`}
                      >
                        {message.role === "agent" ? (
                          <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        ) : message.role === "assistant" ? (
                          <User className="h-5 w-5 text-green-600 dark:text-green-300" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator showAvatar={false} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isHumanSupport
                  ? "Type your response as support agent..."
                  : "Type your response (AI bot mode)..."
              }
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
