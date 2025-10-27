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
import {
  Send,
  Bot,
  User,
  MessageSquare,
  Building2,
  AlertCircle,
  PhoneCall,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { EmbedChatsList } from "@/components/chat/EmbedChatsList";
import {
  saveChatSession,
  updateChatSession,
  isStorageAvailable,
} from "@/lib/embed-chat-storage";

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
    escalationRequested?: boolean;
    escalationReason?: string;
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
  customCSS?: string;
  fontFamily?: string;
  fontSize?: string;
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function EmbedChatContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "chat">("list");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [escalationRequested, setEscalationRequested] = useState(false);
  const [escalationReason, setEscalationReason] = useState<string>("");
  const [escalationActivated, setEscalationActivated] = useState(false);
  const [awaitingSupport, setAwaitingSupport] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
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
  const [storageAvailable, setStorageAvailable] = useState(false);
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
    customCSS: searchParams.get("customCSS") || undefined,
    fontFamily: searchParams.get("fontFamily") || undefined,
    fontSize: searchParams.get("fontSize") || undefined,
  };

  // Check if localStorage is available
  useEffect(() => {
    setStorageAvailable(isStorageAvailable());
  }, []);

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

  // Navigation handlers
  const handleSelectChat = (selectedChatId: string) => {
    setChatId(selectedChatId);
    setView("chat");
    // Reset chat state
    setMessages([]);
    setHasShownWelcome(false);
    setEscalationRequested(false);
    setEscalationActivated(false);
  };

  const handleNewChat = () => {
    setChatId(null);
    setMessages([]);
    setHasShownWelcome(false);
    setEscalationRequested(false);
    setEscalationActivated(false);
    setView("chat");
  };

  const handleBackToList = () => {
    setView("list");
  };

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
            chatId: chatId, // Include chatId to continue conversation
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

              // Capture chatId from first response
              if (parsed.chatId && !chatId) {
                const newChatId = parsed.chatId;
                setChatId(newChatId);

                // Save new chat session to localStorage
                if (storageAvailable && config.chatbotId) {
                  saveChatSession({
                    id: newChatId,
                    chatbotId: config.chatbotId,
                    createdAt: new Date().toISOString(),
                    lastMessageAt: new Date().toISOString(),
                    messageCount: 1,
                    preview: message.slice(0, 100),
                  });
                }
              }

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
              // Check for escalation in the response
              if (parsed.escalationRequested) {
                assistantMessage.metadata = {
                  ...assistantMessage.metadata,
                  escalationRequested: parsed.escalationRequested,
                  escalationReason: parsed.escalationReason,
                };
                setEscalationRequested(true);
                setEscalationReason(
                  parsed.escalationReason || "User requested human assistance"
                );
              }
            } catch (e) {
              console.error("Error parsing streaming data:", e);
            }
          }
        }
      }
      // Update chat session in localStorage after successful message
      if (storageAvailable && chatId && config.chatbotId) {
        updateChatSession(chatId, {
          lastMessageAt: new Date().toISOString(),
          messageCount: messages.length + 2, // +2 for user message and assistant message
          preview: message.slice(0, 100),
        });
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

  const handleConnectSupport = async () => {
    // Activate escalation mode and show waiting state
    setEscalationActivated(true);
    setEscalationRequested(false); // Hide the initial button
    setAwaitingSupport(true); // Show pending status

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

    // Log escalation to backend
    try {
      await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbotId: config.chatbotId,
          chatId: chatId,
          reason: escalationReason,
          messages: messages,
          timestamp: new Date().toISOString(),
          isEmbedded: true,
        }),
      });
    } catch (error) {
      console.error("Error logging escalation:", error);
    }

    // Simulate connection delay, then send support greeting
    setTimeout(() => {
      setAwaitingSupport(false); // Remove pending status
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

  // Apply custom styling based on configuration
  const containerStyle: React.CSSProperties = {
    height: config.height,
    width: config.width,
    borderRadius: config.borderRadius,
    ...(config.fontFamily && { fontFamily: config.fontFamily }),
    ...(config.fontSize && { fontSize: config.fontSize }),
    ...(config.primaryColor && {
      "--primary": config.primaryColor,
      "--primary-foreground": "#ffffff",
    }),
  };

  // Show list view
  if (view === "list") {
    return (
      <>
        {/* Custom CSS injection */}
        {config.customCSS && (
          <style
            dangerouslySetInnerHTML={{
              __html: decodeURIComponent(config.customCSS),
            }}
          />
        )}
        <div className="h-screen w-full bg-background" style={containerStyle}>
          <EmbedChatsList
            chatbotId={config.chatbotId || ""}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            chatbotInfo={
              chatbotInfo
                ? {
                    name: chatbotInfo.name,
                    description: chatbotInfo.description,
                  }
                : undefined
            }
          />
        </div>
      </>
    );
  }

  // Show chat view
  return (
    <>
      {/* Custom CSS injection */}
      {config.customCSS && (
        <style
          dangerouslySetInnerHTML={{
            __html: decodeURIComponent(config.customCSS),
          }}
        />
      )}
      <div className="h-screen w-full bg-background" style={containerStyle}>
        <Card className="h-full flex flex-col border-0 shadow-none">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              {/* Back to list button */}
              {storageAvailable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="mr-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Chats
                </Button>
              )}
              {escalationActivated ? (
                <>
                  <User
                    className={`h-5 w-5 ${
                      awaitingSupport ? "text-amber-600" : "text-green-600"
                    }`}
                  />
                  <span>Customer Support</span>
                  {awaitingSupport ? (
                    <Badge
                      variant="default"
                      className="ml-2 bg-amber-500 hover:bg-amber-500 text-white text-xs animate-pulse"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Awaiting Response
                    </Badge>
                  ) : (
                    <Badge
                      variant="default"
                      className="ml-2 bg-green-600 text-xs"
                    >
                      Live
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <Bot className="h-5 w-5" />
                  {chatbotInfo?.name || "AI Assistant"}
                </>
              )}
              {config.showBranding &&
                chatbotInfo?.organization &&
                !escalationActivated && (
                  <div className="flex gap-2 ml-auto">
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {chatbotInfo.organization.name}
                    </Badge>
                  </div>
                )}
            </CardTitle>
            {chatbotInfo?.description && !escalationActivated && (
              <p className="text-sm text-muted-foreground">
                {chatbotInfo.description}
              </p>
            )}
            {awaitingSupport && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Connecting you with a support representative...
              </p>
            )}
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !chatbotInfo && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Loading chat...
                  </h3>
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
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          CS
                        </span>
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
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-black dark:bg-white flex items-center justify-center">
                        <span className="text-xs font-semibold text-white dark:text-black">
                          U
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        CS
                      </span>
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
                      : config.placeholder
                  }
                  disabled={isLoading}
                  className="flex-1"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  name="chat-message"
                  type="text"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
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
    </>
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
