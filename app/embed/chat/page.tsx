"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import { Send, Bot, User, MessageSquare, Building2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: Array<{
      documentId: string;
      title: string;
      score: number;
      snippet: string;
      type: "organization_description" | "organization" | "context";
    }>;
    tokensUsed?: number;
  };
}

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
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function EmbedChatContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [chatbotInfo, setChatbotInfo] = useState<{
    id: string;
    name: string;
    description?: string;
    organization?: {
      id: string;
      name: string;
    };
  } | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse configuration from URL parameters and data attributes
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
  };

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

  // Show welcome message when chatbot info is loaded
  useEffect(() => {
    if (chatbotInfo && !hasShownWelcome && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: config.welcomeMessage || "Hi, how can I help you today?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [chatbotInfo, hasShownWelcome, messages.length, config.welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

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
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(
        `/api/embed/chatbots/${config.chatbotId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            conversationHistory,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsStreaming(false);
              setStreamingContent("");
              setMessages((prev) => [...prev, assistantMessage]);
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage.content += parsed.content;
                setStreamingContent(assistantMessage.content);
              }
              if (parsed.sources) {
                assistantMessage.metadata = {
                  ...assistantMessage.metadata,
                  sources: parsed.sources,
                };
              }
              if (parsed.tokensUsed) {
                assistantMessage.metadata = {
                  ...assistantMessage.metadata,
                  tokensUsed: parsed.tokensUsed,
                };
              }
            } catch (e) {
              console.error("Error parsing streaming data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  // Apply custom styling based on configuration
  const containerStyle: React.CSSProperties = {
    height: config.height,
    width: config.width,
    borderRadius: config.borderRadius,
    ...(config.primaryColor && {
      "--primary": config.primaryColor,
      "--primary-foreground": "#ffffff",
    }),
  };

  return (
    <div className="h-screen w-full bg-background" style={containerStyle}>
      <Card className="h-full flex flex-col border-0 shadow-none">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5" />
            {chatbotInfo?.name || "AI Assistant"}
            {config.showBranding && chatbotInfo?.organization && (
              <div className="flex gap-2 ml-auto">
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {chatbotInfo.organization.name}
                </Badge>
              </div>
            )}
          </CardTitle>
          {chatbotInfo?.description && (
            <p className="text-sm text-muted-foreground">
              {chatbotInfo.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !chatbotInfo && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Loading chat...</h3>
                <p className="text-muted-foreground max-w-sm">
                  Please wait while we set up your conversation.
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
                {message.role === "assistant" && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-muted">
                  <p className="text-sm whitespace-pre-wrap">
                    {streamingContent}
                    <span className="animate-pulse">|</span>
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={config.placeholder}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback component
function EmbedChatLoading() {
  return (
    <div className="h-screen w-full bg-background">
      <Card className="h-full flex flex-col border-0 shadow-none">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading chat...</h3>
              <p className="text-muted-foreground max-w-sm">
                Please wait while we set up your conversation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
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
