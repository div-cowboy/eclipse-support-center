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
  MessageSquare,
  Building2,
  AlertCircle,
  PhoneCall,
  Clock,
  CheckCircle,
  Eye,
  EyeOff,
  Bug,
  ArrowLeft,
} from "lucide-react";
import { TypingIndicator } from "./TypingIndicator";
import { useRealtimeChat } from "../hooks/useRealtimeChat";
import type { RealtimeChatMessage } from "../hooks/useRealtimeChat";

// Universal message interface that covers all use cases
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    // Organization/Chatbot chat metadata
    sources?: Array<{
      documentId: string;
      title: string;
      score: number;
      snippet: string;
      type?: "organization_description" | "organization" | "context";
    }>;
    tokensUsed?: number;
    rawResponse?: Record<string, unknown>;

    // Escalation metadata
    escalationRequested?: boolean;
    escalationReason?: string;

    // Traditional chat metadata
    status?: "pending" | "resolved" | "escalated";
    priority?: "low" | "medium" | "high" | "urgent";
    assignedTo?: string;
  };
}

// Configuration interface for different chat modes
export interface ChatConfig {
  // API Configuration
  apiEndpoint: string;
  apiMethod?: "POST";

  // Chat Type
  type: "organization" | "chatbot" | "traditional" | "embed";

  // Identifiers
  organizationId?: string;
  chatbotId?: string;
  chatId?: string;

  // UI Configuration
  title?: string;
  description?: string;
  placeholder?: string;
  welcomeMessage?: string;
  className?: string;
  height?: string;

  // Features
  features: {
    streaming?: boolean;
    escalation?: boolean;
    debugMode?: boolean;
    contextBlocks?: boolean;
    multiChat?: boolean;
    supportView?: boolean;
    realtimeMode?: boolean; // Enable real-time chat (for escalated chats)
    showBranding?: boolean;
    showSources?: boolean;
    showTokens?: boolean;
    showStatus?: boolean;
    showPriority?: boolean;
    showAssignedTo?: boolean;
  };

  // Styling
  styling?: {
    primaryColor?: string;
    borderRadius?: string;
    fontFamily?: string;
    fontSize?: string;
    customCSS?: string;
  };

  // Callbacks
  onChatCreated?: (chatId: string) => void;
  onEscalationRequested?: (reason: string) => void;
  onMessageSent?: (message: ChatMessage) => void;
  onBackToList?: () => void;
}

interface UniversalChatInterfaceProps {
  config: ChatConfig;
}

export function UniversalChatInterface({
  config,
}: UniversalChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // Escalation state
  const [escalationRequested, setEscalationRequested] = useState(false);
  const [escalationReason, setEscalationReason] = useState<string>("");
  const [escalationActivated, setEscalationActivated] = useState(false);
  const [awaitingSupport, setAwaitingSupport] = useState(false);

  // Real-time chat state
  const [realtimeMode, setRealtimeMode] = useState(
    config.features.realtimeMode || false
  );

  // Chat info state
  const [chatInfo, setChatInfo] = useState<{
    name?: string;
    status?: string;
    escalationRequested?: boolean;
    assignedToId?: string;
    assignedTo?: { name?: string };
    assignedAt?: string;
    organization?: { name: string };
    _count?: { messages?: number; contextBlocks?: number };
  } | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time chat hook - handles message broadcasting
  const { sendMessage: sendRealtimeMessage } = useRealtimeChat({
    chatId: config.chatId || "",
    enabled: realtimeMode && !!config.chatId,
    onMessage: (message: RealtimeChatMessage) => {
      // Add incoming real-time message to messages array
      console.log("[UniversalChatInterface] Received real-time message:", {
        id: message.id,
        role: message.role,
        sender: message.sender.name,
      });

      const chatMessage: ChatMessage = {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: new Date(message.timestamp),
      };

      setMessages((prev) => {
        // Check if message already exists (avoid duplicates from optimistic updates)
        const exists = prev.some((msg) => msg.id === message.id);
        if (exists) {
          console.log(
            "[UniversalChatInterface] Message already exists, skipping"
          );
          return prev;
        }

        // Remove any optimistic message with same content (replace optimistic with real)
        const withoutOptimistic = prev.filter(
          (msg) =>
            !msg.id.startsWith("optimistic_") || msg.content !== message.content
        );

        return [...withoutOptimistic, chatMessage];
      });
    },
    onAgentJoined: (agent) => {
      // Show system message when agent joins
      console.log("🎉 AGENT JOINED EVENT RECEIVED:", agent);
      setAwaitingSupport(false);

      // Check if we already have an agent joined message (prevent duplicates)
      setMessages((prev) => {
        const hasAgentJoined = prev.some((msg) =>
          msg.id.startsWith("system_agent_joined_")
        );

        if (hasAgentJoined) {
          console.log(
            "⚠️ Agent joined message already exists, skipping duplicate"
          );
          return prev;
        }

        const systemMessage: ChatMessage = {
          id: `system_agent_joined_${Date.now()}`,
          role: "system",
          content: `✅ You're now connected to ${agent.agentName}`,
          timestamp: new Date(agent.timestamp),
        };

        console.log("✅ Agent joined message added to chat");
        return [...prev, systemMessage];
      });
    },
    onError: (error) => {
      console.error("[UniversalChatInterface] Real-time error:", error);
    },
  });

  // Load chat info based on type
  useEffect(() => {
    const loadChatInfo = async () => {
      if (
        (config.type === "chatbot" || config.type === "embed") &&
        config.chatbotId
      ) {
        try {
          const endpoint =
            config.type === "embed"
              ? `/api/embed/chatbots/${config.chatbotId}`
              : `/api/chatbots/${config.chatbotId}`;
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            setChatInfo(data);
          }
        } catch (error) {
          console.error("Error loading chatbot info:", error);
        }
      } else if (config.type === "traditional" && config.chatId) {
        try {
          const response = await fetch(`/api/chats/${config.chatId}`);
          if (response.ok) {
            const data = await response.json();
            setChatInfo(data);
            // Map database message roles to frontend format
            const mappedMessages = (data.messages || []).map(
              (msg: {
                role: string;
                createdAt: string;
                [key: string]: unknown;
              }) => ({
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
      }
    };

    loadChatInfo();
  }, [config.type, config.chatbotId, config.chatId]);

  // Show welcome message
  useEffect(() => {
    if (config.welcomeMessage && !hasShownWelcome && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: config.welcomeMessage,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [config.welcomeMessage, hasShownWelcome, messages.length]);

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

    console.log("[UniversalChatInterface] sendMessage called:", {
      realtimeMode,
      chatId: config.chatId,
      supportView: config.features.supportView,
      willUseRealtime: realtimeMode && !!config.chatId,
    });

    // REAL-TIME MODE: Route to real-time chat system
    if (realtimeMode && config.chatId) {
      const messageRole = config.features.supportView ? "ASSISTANT" : "USER";

      console.log("[UniversalChatInterface] Using REAL-TIME mode:", {
        messageRole,
        chatId: config.chatId,
      });

      // OPTIMISTIC UI UPDATE: Add message to UI immediately
      const optimisticMessage: ChatMessage = {
        id: `optimistic_${Date.now()}`,
        role: messageRole === "ASSISTANT" ? "assistant" : "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      setInputMessage("");
      setIsLoading(true);

      try {
        const success = await sendRealtimeMessage(message, messageRole);

        if (!success) {
          throw new Error("Failed to send real-time message");
        }

        console.log(
          "[UniversalChatInterface] Real-time message sent successfully"
        );
      } catch (error) {
        console.error("Error sending real-time message:", error);

        // Remove optimistic message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMessage.id)
        );

        // Show error message
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: "system",
          content: "Failed to send message. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }

      return; // Exit early for real-time mode
    }

    console.log("[UniversalChatInterface] Using AI mode (not real-time)");

    // AI MODE: Normal AI processing (existing code)
    const messageRole = config.features.supportView ? "assistant" : "user";
    const userMessage: ChatMessage = {
      id: `${messageRole}_${Date.now()}`,
      role: messageRole,
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    if (useStreaming && config.features.streaming) {
      setIsStreaming(true);
      setStreamingContent("");
    }

    try {
      const requestBody: {
        message: string;
        conversationHistory: ChatMessage[];
        organizationId?: string;
        stream?: boolean;
        chatId?: string;
        role?: string;
      } = {
        message,
        conversationHistory: messages,
      };

      // Add type-specific fields
      if (config.type === "organization") {
        requestBody.organizationId = config.organizationId;
        requestBody.stream = useStreaming;
      } else if (config.type === "chatbot" || config.type === "embed") {
        requestBody.stream = useStreaming;
        // Always send chatId if available
        requestBody.chatId = config.chatId;
        console.log("📤 Sending message with chatId:", config.chatId);
      } else if (config.type === "traditional") {
        requestBody.chatId = config.chatId || undefined;
        requestBody.role = config.features.supportView ? "ASSISTANT" : "USER";
      }

      console.log("[UniversalChatInterface] Calling AI API:", {
        endpoint: config.apiEndpoint,
        chatId: config.chatId,
        type: config.type,
      });

      const response = await fetch(config.apiEndpoint, {
        method: config.apiMethod || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (useStreaming && config.features.streaming) {
        await handleStreamingResponse(response);
      } else {
        await handleRegularResponse(response);
      }

      // Callback for message sent
      if (config.onMessageSent) {
        config.onMessageSent(userMessage);
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

  const handleStreamingResponse = async (response: Response) => {
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

              // Capture chatId from response
              if (parsed.chatId && config.onChatCreated) {
                // Only call once
                if (!assistantMessage && !config.chatId) {
                  config.onChatCreated(parsed.chatId);
                  console.log(
                    "📝 Chat ID captured from streaming:",
                    parsed.chatId
                  );
                }
              }

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
              }

              // Check for escalation
              if (
                parsed.isComplete &&
                parsed.escalationRequested &&
                config.features.escalation
              ) {
                setEscalationRequested(true);
                setEscalationReason(
                  parsed.escalationReason || "User requested human assistance"
                );
              }
            } catch {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    }
  };

  const handleRegularResponse = async (response: Response) => {
    const data = await response.json();

    if (data.success) {
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.response?.content || data.response || "Response received",
        timestamp: new Date(),
        metadata: {
          sources: data.sources,
          tokensUsed: data.tokensUsed,
          rawResponse: data,
          escalationRequested: data.escalationRequested,
          escalationReason: data.escalationReason,
        },
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update chat info for new chats
      if (data.chatId && config.onChatCreated) {
        config.onChatCreated(data.chatId);
        console.log("📝 Chat ID captured from response:", data.chatId);
      }
      if (data.chat) {
        setChatInfo(data.chat);
      }

      // Check for escalation
      if (data.escalationRequested && config.features.escalation) {
        setEscalationRequested(true);
        setEscalationReason(
          data.escalationReason || "User requested human assistance"
        );
      }

      // Add agent confirmation for traditional chat
      if (config.type === "traditional" && !config.features.supportView) {
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
      throw new Error(data.error || "Failed to get response");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage, false);
  };

  const handleStreamingSubmit = () => {
    if (inputMessage.trim() && config.features.streaming) {
      sendMessage(inputMessage, true);
    }
  };

  const handleConnectSupport = async () => {
    setEscalationActivated(true);
    setEscalationRequested(false);
    setAwaitingSupport(true);

    const handoffMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: "system",
      content: "⏱️ Connecting you to a support agent. Please wait...",
      timestamp: new Date(),
      metadata: {
        escalationRequested: true,
      },
    };
    setMessages((prev) => [...prev, handoffMessage]);

    try {
      // Call escalation API to mark chat as escalated
      const escalationResponse = await fetch("/api/escalations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatbotId: config.chatbotId,
          chatId: config.chatId,
          reason: escalationReason || "User requested human assistance",
          messages: messages,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!escalationResponse.ok) {
        throw new Error("Failed to log escalation");
      }

      console.log("✅ Escalation logged successfully");

      // Activate real-time mode
      setRealtimeMode(true);

      console.log("✅ Real-time mode activated - waiting for agent to join");
      console.log("📡 Real-time subscription details:", {
        chatId: config.chatId,
        realtimeMode: true,
        enabled: true && !!config.chatId,
        channelName: `chat:${config.chatId}`,
      });

      // Log escalation callback
      if (config.onEscalationRequested) {
        config.onEscalationRequested(escalationReason);
      }
    } catch (error) {
      console.error("Error during escalation:", error);

      // Show error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "system",
        content:
          "Failed to connect to support. Please try again or contact us directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      setAwaitingSupport(false);
      setEscalationActivated(false);
    }
  };

  const getSourceIcon = (type?: string) => {
    if (type === "organization_description") return Building2;
    return type === "organization" ? Building2 : MessageSquare;
  };

  const getSourceLabel = (type?: string) => {
    if (type === "organization_description") return "Org Info";
    return type === "organization" ? "Org Doc" : "Context";
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

  // Apply custom styling
  const containerStyle: React.CSSProperties = {
    height: config.height || "600px",
    ...(config.styling?.fontFamily && {
      fontFamily: config.styling.fontFamily,
    }),
    ...(config.styling?.fontSize && { fontSize: config.styling.fontSize }),
    ...(config.styling?.primaryColor && {
      "--primary": config.styling.primaryColor,
      "--primary-foreground": "#ffffff",
    }),
  };

  return (
    <>
      {/* Custom CSS injection */}
      {config.styling?.customCSS && (
        <style
          dangerouslySetInnerHTML={{
            __html: decodeURIComponent(config.styling.customCSS),
          }}
        />
      )}
      <Card
        className={`flex flex-col ${config.className || ""}`}
        style={containerStyle}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {/* Back to list button */}
            {config.features.multiChat && config.onBackToList && (
              <Button
                variant="ghost"
                size="sm"
                onClick={config.onBackToList}
                className="mr-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Chats
              </Button>
            )}

            {/* Main title with appropriate icon */}
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
                {config.title || chatInfo?.name || "AI Assistant"}
              </>
            )}

            {/* Feature badges */}
            {chatInfo && !escalationActivated && (
              <div className="flex gap-2 ml-auto">
                {config.features.debugMode && (
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
                )}
                {config.features.contextBlocks &&
                  chatInfo._count?.contextBlocks && (
                    <Badge variant="outline" className="text-xs">
                      {chatInfo._count.contextBlocks} context blocks
                    </Badge>
                  )}
                {config.features.showBranding && chatInfo.organization && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    {chatInfo.organization.name}
                  </Badge>
                )}
                {config.features.showStatus && chatInfo.status && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(chatInfo.status)}`}
                  >
                    {chatInfo.status}
                  </Badge>
                )}
                {chatInfo._count?.messages && (
                  <Badge variant="outline" className="text-xs">
                    {chatInfo._count.messages} messages
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>

          {config.description && !escalationActivated && (
            <p className="text-sm text-muted-foreground">
              {config.description}
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
            {messages.length === 0 && !chatInfo && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {config.type === "traditional"
                    ? "Start a conversation"
                    : "Loading chat..."}
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  {config.type === "traditional"
                    ? "Send us a message and our support team will get back to you as soon as possible."
                    : "Please wait while we set up your conversation."}
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              // Check for handoff message in traditional chat
              const isHandoffMessage =
                config.type === "traditional" &&
                message.role === "assistant" &&
                index > 0 &&
                chatInfo?.escalationRequested &&
                chatInfo?.assignedAt &&
                new Date(message.timestamp) >= new Date(chatInfo.assignedAt) &&
                !messages.slice(0, index).some((m) => m.role === "assistant");

              return (
                <div key={message.id}>
                  {/* Handoff banner */}
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
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Avatar for assistant messages */}
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 max-w-[80%]">
                      {/* Sender label for traditional chat */}
                      {config.type === "traditional" && (
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
                      )}

                      <div
                        className={`rounded-lg px-3 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.role === "system"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                            : message.role === "agent"
                            ? "bg-blue-600 text-white"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>

                        {/* Debug mode - show raw response */}
                        {config.features.debugMode &&
                          debugMode &&
                          message.metadata?.rawResponse && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Bug className="h-3 w-3 text-orange-500" />
                                <p className="text-xs font-medium text-orange-600">
                                  Debug Data
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs font-mono overflow-x-auto">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(
                                    message.metadata.rawResponse,
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </div>
                          )}

                        {/* Sources */}
                        {config.features.showSources &&
                          message.metadata?.sources &&
                          message.metadata.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground mb-1">
                                Sources:
                              </p>
                              <div className="space-y-1">
                                {message.metadata.sources.map(
                                  (source, index) => {
                                    const SourceIcon = getSourceIcon(
                                      source.type
                                    );
                                    return (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <SourceIcon className="h-3 w-3" />
                                        <span className="truncate">
                                          {source.title}
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {getSourceLabel(source.type)}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {(source.score * 100).toFixed(0)}%
                                        </Badge>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {/* Tokens used */}
                        {config.features.showTokens &&
                          message.metadata?.tokensUsed && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Tokens used: {message.metadata.tokensUsed}
                            </p>
                          )}

                        {/* Message metadata for traditional chat */}
                        {config.type === "traditional" && message.metadata && (
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            {config.features.showStatus &&
                              message.metadata.status && (
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(message.metadata.status)}
                                  <span className="capitalize">
                                    {message.metadata.status}
                                  </span>
                                </div>
                              )}
                            {config.features.showPriority &&
                              message.metadata.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {message.metadata.priority}
                                </Badge>
                              )}
                            {config.features.showAssignedTo &&
                              message.metadata.assignedTo && (
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
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Avatar for user messages */}
                    {message.role === "user" && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

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

            {/* Typing indicator */}
            {isLoading && !isStreaming && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Escalation Button */}
          {config.features.escalation && escalationRequested && (
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
                    : config.placeholder || "Type your message..."
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
              {config.features.streaming && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStreamingSubmit}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  Stream
                </Button>
              )}
            </form>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
