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
import { Send, Bot, User, FileText } from "lucide-react";
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
    }>;
    tokensUsed?: number;
  };
}

interface ChatInterfaceProps {
  organizationId: string;
  className?: string;
}

export function ChatInterface({
  organizationId,
  className = "",
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const response = await fetch(
        `/api/organizations/${organizationId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            conversationHistory: messages,
            stream: useStreaming,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (useStreaming) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let assistantMessage: ChatMessage | null = null;

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
                    setMessages((prev) => [...prev, assistantMessage!]);
                  }
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    setStreamingContent((prev) => prev + parsed.content);

                    if (!assistantMessage) {
                      assistantMessage = {
                        id: `assistant_${Date.now()}`,
                        role: "assistant",
                        content: "",
                        timestamp: new Date(),
                        metadata: {
                          sources: parsed.sources || [],
                        },
                      };
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
            content: data.response.content,
            timestamp: new Date(),
            metadata: {
              sources: data.sources,
              tokensUsed: data.tokensUsed,
            },
          };
          setMessages((prev) => [...prev, assistantMessage]);
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

  return (
    <Card className={`h-[600px] flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Organization Chat
        </CardTitle>
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

                {message.metadata?.sources &&
                  message.metadata.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">
                        Sources:
                      </p>
                      <div className="space-y-1">
                        {message.metadata.sources.map((source, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-xs"
                          >
                            <FileText className="h-3 w-3" />
                            <span className="truncate">{source.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {(source.score * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {message.metadata?.tokensUsed && (
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

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about your organization..."
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
