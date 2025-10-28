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
  Bot,
  User,
  Building2,
  MessageSquare,
  Bug,
  Eye,
  EyeOff,
  AlertCircle,
  PhoneCall,
} from "lucide-react";
import { TypingIndicator } from "./TypingIndicator";

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
    rawResponse?: Record<string, unknown>; // Store the raw API response for debugging
    escalationRequested?: boolean;
    escalationReason?: string;
  };
}

interface ChatbotChatInterfaceProps {
  chatbotId: string;
  className?: string;
}

export function ChatbotChatInterface({
  chatbotId,
  className = "",
}: ChatbotChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [escalationRequested, setEscalationRequested] = useState(false);
  const [escalationReason, setEscalationReason] = useState<string>("");
  const [escalationActivated, setEscalationActivated] = useState(false);
  const [chatbotInfo, setChatbotInfo] = useState<{
    id: string;
    name: string;
    description?: string;
    status: string;
    config?: Record<string, unknown>;
    organization?: Record<string, unknown>;
    contextBlockCount?: number;
    organizationDocumentCount?: number;
    _count?: {
      contextBlocks?: number;
    };
  } | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chatbot info on mount
  useEffect(() => {
    const loadChatbotInfo = async () => {
      try {
        const response = await fetch(`/api/chatbots/${chatbotId}`);
        if (response.ok) {
          const data = await response.json();
          setChatbotInfo(data);
        }
      } catch (error) {
        console.error("Error loading chatbot info:", error);
      }
    };

    loadChatbotInfo();
  }, [chatbotId]);

  // Show welcome message when chatbot info is loaded
  useEffect(() => {
    if (chatbotInfo && !hasShownWelcome && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: "Hi, how can I help you today?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [chatbotInfo, hasShownWelcome, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const sendMessage = async (
    message: string,
    useStreaming: boolean = false
  ) => {
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

    if (useStreaming) {
      setIsStreaming(true);
      setStreamingContent("");
    }

    try {
      const response = await fetch(`/api/chatbots/${chatbotId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages,
          stream: useStreaming,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (useStreaming) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let assistantMessage: ChatMessage | null = null;
          let fullContent = "";

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
                  if (assistantMessage) {
                    assistantMessage.content = fullContent;
                    setMessages((prev) => [...prev, assistantMessage!]);
                  }
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    setStreamingContent((prev) => prev + parsed.content);
                    fullContent += parsed.content;

                    if (!assistantMessage) {
                      assistantMessage = {
                        id: `assistant_${Date.now()}`,
                        role: "assistant",
                        content: "",
                        timestamp: new Date(),
                        metadata: {
                          sources: parsed.sources || [],
                          escalationRequested: parsed.escalationRequested,
                          escalationReason: parsed.escalationReason,
                        },
                      };
                    }

                    // Check for escalation in final chunk
                    if (parsed.isComplete && parsed.escalationRequested) {
                      setEscalationRequested(true);
                      setEscalationReason(
                        parsed.escalationReason ||
                          "User requested human assistance"
                      );
                    }
                  }
                } catch {
                  // Ignore parsing errors for incomplete chunks
                }
              }
            }
          }
        }
      } else {
        // Handle regular response
        const data = await response.json();

        if (data.success) {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
            metadata: {
              sources: data.sources,
              tokensUsed: data.tokensUsed,
              rawResponse: data, // Store the complete raw response for debugging
              escalationRequested: data.escalationRequested,
              escalationReason: data.escalationReason,
            },
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Check for escalation
          if (data.escalationRequested) {
            setEscalationRequested(true);
            setEscalationReason(
              data.escalationReason || "User requested human assistance"
            );
          }
        } else {
          throw new Error(data.error || "Failed to get response");
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
    sendMessage(inputMessage, false);
  };

  const handleStreamingSubmit = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage, true);
    }
  };

  const getSourceIcon = (
    type: "organization_description" | "organization" | "context"
  ) => {
    if (type === "organization_description") return Building2;
    return type === "organization" ? Building2 : MessageSquare;
  };

  const getSourceLabel = (
    type: "organization_description" | "organization" | "context"
  ) => {
    if (type === "organization_description") return "Org Info";
    return type === "organization" ? "Org Doc" : "Context";
  };

  const handleConnectSupport = async () => {
    // Activate escalation mode
    setEscalationActivated(true);
    setEscalationRequested(false); // Hide the initial button

    // Add handoff message
    const handoffMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: "assistant",
      content: "🔄 Transferring you to a customer support representative...",
      timestamp: new Date(),
      metadata: {
        escalationRequested: true,
      },
    };
    setMessages((prev) => [...prev, handoffMessage]);

    // Send escalation notification to backend
    try {
      await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbotId,
          reason: escalationReason,
          messages: messages,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Error logging escalation:", error);
    }

    // Simulate connection delay, then send support greeting
    setTimeout(() => {
      const supportGreeting: ChatMessage = {
        id: `support_${Date.now()}`,
        role: "assistant",
        content:
          "👋 Hi! I'm a customer support representative. I've reviewed your conversation. What can I help you with today?",
        timestamp: new Date(),
        metadata: {
          escalationRequested: false,
        },
      };
      setMessages((prev) => [...prev, supportGreeting]);
    }, 1500);
  };

  return (
    <Card className={`h-[600px] flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {escalationActivated ? (
            <>
              <User className="h-5 w-5 text-green-600" />
              <span>Customer Support</span>
              <Badge variant="default" className="ml-2 bg-green-600 text-xs">
                Live
              </Badge>
            </>
          ) : (
            <>
              <Bot className="h-5 w-5" />
              {chatbotInfo?.name || "Chatbot"}
            </>
          )}
          {chatbotInfo && !escalationActivated && (
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDebugMode(!debugMode)}
                className="text-xs"
              >
                {debugMode ? (
                  <EyeOff className="h-3 w-3 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                {debugMode ? "Hide Debug" : "Show Debug"}
              </Button>
              <Badge variant="outline" className="text-xs">
                {chatbotInfo._count?.contextBlocks || 0} context blocks
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
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
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
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Debug indicator - remove this after testing */}
                {process.env.NODE_ENV === "development" && (
                  <div className="text-xs text-gray-400 mt-1">
                    Debug: {debugMode ? "ON" : "OFF"} | Sources:{" "}
                    {message.metadata?.sources?.length || 0}
                  </div>
                )}

                {/* Debug Mode - Show Raw Response Data */}
                {debugMode && message.metadata?.rawResponse && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Bug className="h-3 w-3 text-orange-500" />
                      <p className="text-xs font-medium text-orange-600">
                        Debug Data
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs font-mono overflow-x-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(message.metadata.rawResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Sources - Only show in debug mode */}
                {debugMode &&
                  message.metadata?.sources &&
                  message.metadata.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">
                        Sources:
                      </p>
                      <div className="space-y-1">
                        {message.metadata.sources.map((source, index) => {
                          const SourceIcon = getSourceIcon(source.type);
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-xs"
                            >
                              <SourceIcon className="h-3 w-3" />
                              <span className="truncate">{source.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {getSourceLabel(source.type)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {(source.score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Tokens used - Only show in debug mode */}
                {debugMode && message.metadata?.tokensUsed && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tokens used: {message.metadata.tokensUsed}
                  </p>
                )}
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
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

          {/* Typing indicator - only show when loading but not streaming */}
          {isLoading && !isStreaming && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Escalation Button */}
        {escalationRequested && (
          <div className="border-t border-b bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Would you like to speak with a human representative?
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                  {escalationReason ||
                    "We're here to help you connect with our support team."}
                </p>
                <Button
                  onClick={handleConnectSupport}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Connect with Customer Support
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                escalationActivated
                  ? "Message customer support..."
                  : "Ask a question..."
              }
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleStreamingSubmit}
              disabled={isLoading || !inputMessage.trim()}
            >
              Stream
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
