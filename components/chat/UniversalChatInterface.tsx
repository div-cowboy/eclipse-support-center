"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardHeader } from "@/components/shadcn/ui/card";
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
  Bug,
  ArrowLeft,
  X,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { TypingIndicator } from "./TypingIndicator";
import { useRealtimeChat } from "../hooks/useRealtimeChat";
import type { RealtimeChatMessage } from "../hooks/useRealtimeChat";
import { CreateTicketFromChatModal } from "../tickets/CreateTicketFromChatModal";

// Universal message interface that covers all use cases
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  timestamp: Date;
  userId?: string; // ID of the user who sent this message
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

    // System message metadata
    type?: "agent_joined" | "agent_left" | "escalation_started" | string;
    agentId?: string;
    agentName?: string;
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
  currentUserId?: string; // ID of the current user viewing the chat

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
  onMessageReceived?: (message: ChatMessage) => void;
  onBackToList?: () => void;
  onClose?: () => void; // Close button callback
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // Loading existing chat

  // Escalation state
  const [escalationRequested, setEscalationRequested] = useState(false);
  const [escalationReason, setEscalationReason] = useState<string>("");
  const [escalationActivated, setEscalationActivated] = useState(
    config.features.realtimeMode || false // If realtimeMode is enabled in config, escalation is active
  );
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
  const [showTicketModal, setShowTicketModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        userId: message.sender.id, // Include sender ID for message alignment
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

        // Notify parent of received message if it's from assistant/agent (not our own message)
        if (
          (chatMessage.role === "assistant" || chatMessage.role === "agent") &&
          config.onMessageReceived
        ) {
          config.onMessageReceived(chatMessage);
        }

        return [...withoutOptimistic, chatMessage];
      });
    },
    onAgentJoined: (agent) => {
      // Show system message when agent joins
      console.log("🎉 AGENT JOINED EVENT RECEIVED:", agent);
      setAwaitingSupport(false);

      // Check if we already have an agent joined message (prevent duplicates)
      // This can happen if the message was already loaded from the database
      setMessages((prev) => {
        const hasAgentJoined = prev.some(
          (msg) =>
            msg.role === "system" &&
            (msg.id.startsWith("system_agent_joined_") ||
              msg.content.includes("You're now connected to") ||
              msg.metadata?.type === "agent_joined")
        );

        if (hasAgentJoined) {
          console.log(
            "⚠️ Agent joined message already exists (from DB or real-time), skipping duplicate"
          );
          return prev;
        }

        const systemMessage: ChatMessage = {
          id: `system_agent_joined_${Date.now()}`,
          role: "system",
          content: `✅ You're now connected to ${agent.agentName}`,
          timestamp: new Date(agent.timestamp),
          metadata: {
            type: "agent_joined",
            agentId: agent.agentId,
            agentName: agent.agentName,
          },
        };

        console.log("✅ Agent joined message added to chat (real-time)");
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
          // Load chatbot info
          const endpoint =
            config.type === "embed"
              ? `/api/embed/chatbots/${config.chatbotId}`
              : `/api/chatbots/${config.chatbotId}`;
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            setChatInfo(data);
          }

          // For embed chats with chatId, also load existing messages
          if (config.type === "embed" && config.chatId) {
            setIsLoadingHistory(true); // Start loading
            try {
              const chatResponse = await fetch(
                `/api/embed/chats/${config.chatId}`
              );
              if (chatResponse.ok) {
                const chatData = await chatResponse.json();
                // Map database message roles to frontend format
                const mappedMessages = (chatData.messages || []).map(
                  (msg: {
                    role: string;
                    createdAt: string;
                    userId?: string;
                    [key: string]: unknown;
                  }) => ({
                    ...msg,
                    role: msg.role.toLowerCase() as
                      | "user"
                      | "assistant"
                      | "agent"
                      | "system",
                    timestamp: new Date(msg.createdAt),
                    userId: msg.userId,
                  })
                );
                setMessages(mappedMessages);

                // Update chat info with escalation status
                if (chatData.escalationRequested) {
                  setEscalationRequested(true);
                  setEscalationReason(chatData.escalationReason || "");
                  setEscalationActivated(true);
                  // Enable real-time mode if chat is escalated
                  setRealtimeMode(true);
                }
              }
            } catch (error) {
              console.error("Error loading embed chat messages:", error);
            } finally {
              setIsLoadingHistory(false); // Done loading
            }
          }
        } catch (error) {
          console.error("Error loading chatbot info:", error);
        }
      } else if (config.type === "traditional" && config.chatId) {
        setIsLoadingHistory(true); // Start loading
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

            // Update escalation status if chat is already escalated
            if (data.escalationRequested) {
              setEscalationRequested(true);
              setEscalationReason(data.escalationReason || "");
              setEscalationActivated(true); // Set escalation as activated
              // Enable real-time mode if chat is escalated
              setRealtimeMode(true);
              console.log(
                "[UniversalChatInterface] Traditional chat is escalated, activating real-time mode"
              );
            }
          }
        } catch (error) {
          console.error("Error loading chat info:", error);
        } finally {
          setIsLoadingHistory(false); // Done loading
        }
      }
    };

    loadChatInfo();
  }, [config.type, config.chatbotId, config.chatId]);

  // Show welcome message (only for NEW chats, not when loading existing chat)
  useEffect(() => {
    if (
      config.welcomeMessage &&
      !hasShownWelcome &&
      messages.length === 0 &&
      !config.chatId && // Only show for new chats
      !isLoadingHistory // Not while loading existing chat
    ) {
      const welcomeMessage: ChatMessage = {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: config.welcomeMessage,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [
    config.welcomeMessage,
    hasShownWelcome,
    messages.length,
    config.chatId,
    isLoadingHistory,
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputMessage]);

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
        userId: config.currentUserId, // Include current user ID for message alignment
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

                // Notify parent of received message (for localStorage updates in embed mode)
                if (config.onMessageReceived) {
                  config.onMessageReceived(assistantMessage);
                }
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

      // Notify parent of received message (for localStorage updates in embed mode)
      if (config.onMessageReceived) {
        config.onMessageReceived(assistantMessage);
      }

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
    // Use streaming if available, otherwise use regular mode
    sendMessage(inputMessage, config.features.streaming || false);
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

  // Apply custom styling
  const containerStyle: React.CSSProperties = {
    ...(config.height && { height: config.height }),
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
        className={`flex flex-col h-full ${config.className || ""}`}
        style={containerStyle}
      >
        <CardHeader className="pb-3 px-4 flex-shrink-0 border-b border-[#E0E0E0]">
          {/* Simplified Header with Flexbox Layout */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back Button */}
            <div className="flex-shrink-0">
              {config.features.multiChat && config.onBackToList ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={config.onBackToList}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
              ) : (
                <div className="h-8 w-8" /> // Placeholder for alignment
              )}
            </div>

            {/* Center: Title */}
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-lg font-semibold">
                {escalationActivated ? "Support" : "Chat"}
              </h2>
              {awaitingSupport && (
                <Badge
                  variant="default"
                  className="ml-2 bg-amber-500 hover:bg-amber-500 text-white text-xs animate-pulse"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Connecting...
                </Badge>
              )}
              {escalationActivated && !awaitingSupport && (
                <Badge variant="default" className="ml-2 bg-green-600 text-xs">
                  Live
                </Badge>
              )}
            </div>

            {/* Right: Close Button */}
            <div className="flex-shrink-0">
              {config.onClose ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={config.onClose}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                >
                  <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
              ) : (
                <div className="h-8 w-8" /> // Placeholder for alignment
              )}
            </div>
          </div>

          {/* Optional subtitle for awaiting support state */}
          {awaitingSupport && (
            <p className="text-sm text-amber-600 dark:text-amber-400 text-center mt-2">
              Connecting you with a support representative...
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {/* Combined loading state - shows when loading chat info or history */}
            {(isLoadingHistory ||
              (!chatInfo &&
                messages.length === 0 &&
                config.type !== "traditional")) && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarLoader
                  color="#000"
                  height={4}
                  width={100}
                  className="mb-4"
                />
              </div>
            )}

            {/* Empty state (only for new chats when not loading) */}
            {!isLoadingHistory &&
              messages.length === 0 &&
              chatInfo &&
              config.type === "traditional" && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-muted-foreground max-w-sm">
                    Send us a message and our support team will get back to you
                    as soon as possible.
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

              // Determine if this message is from the current user
              // Use userId comparison if available, otherwise fall back to role-based logic
              const isOwnMessage =
                config.currentUserId && message.userId
                  ? message.userId === config.currentUserId
                  : config.features.supportView
                  ? // In support view, only post-assignment assistant messages are "own"
                    message.role === "assistant" &&
                    chatInfo?.assignedAt &&
                    new Date(message.timestamp) >= new Date(chatInfo.assignedAt)
                  : message.role === "user"; // In customer view, user messages are "own"

              return (
                <div key={message.id}>
                  {/* Handoff banner */}
                  {isHandoffMessage && (
                    <div className="flex items-center justify-center py-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full">
                        <PhoneCall className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-100">
                          Chat transferred to human support
                        </span>
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex gap-3 ${
                      isOwnMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Avatar for other people's messages (not own messages) */}
                    {!isOwnMessage && message.role !== "system" && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {message.role === "assistant" ||
                          message.role === "agent" ? (
                            <Bot className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 max-w-[80%]">
                      {/* Sender label for traditional chat */}
                      {config.type === "traditional" && (
                        <span
                          className={`text-xs text-muted-foreground px-1 ${
                            isOwnMessage ? "text-right" : "text-left"
                          }`}
                        >
                          {(() => {
                            // Determine sender label based on role and context
                            if (isOwnMessage) {
                              return "You";
                            }

                            // For customer messages
                            if (message.role === "user") {
                              return config.features.supportView
                                ? "Customer"
                                : "You";
                            }

                            // For AI agent/bot messages
                            if (message.role === "agent") {
                              return "AI Agent";
                            }

                            // For assistant messages - distinguish between bot and human agent
                            if (message.role === "assistant") {
                              // If chat is assigned and message is after assignment, it's from human agent
                              if (
                                chatInfo?.assignedAt &&
                                new Date(message.timestamp) >=
                                  new Date(chatInfo.assignedAt)
                              ) {
                                return (
                                  chatInfo?.assignedTo?.name || "Support Agent"
                                );
                              }
                              // Otherwise it's from the AI bot
                              return "AI Assistant";
                            }

                            // System messages
                            return "System";
                          })()}
                        </span>
                      )}

                      <div
                        className={`rounded-lg px-3 py-2 ${
                          isOwnMessage
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
                              ? "text-gray-400"
                              : "opacity-70"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Avatar for own messages */}
                    {isOwnMessage && (
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

            {/* Streaming message (only show for AI, not after escalation) */}
            {isStreaming && streamingContent && !escalationActivated && (
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

            {/* Typing indicator (only show for AI, not after escalation) */}
            {isLoading && !isStreaming && !escalationActivated && (
              <TypingIndicator />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Escalation Button */}
          {config.features.escalation && escalationRequested && (
            <div className="border-t border-b bg-blue-50 dark:bg-blue-950 p-4 flex-shrink-0">
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
          <div className="border-t border-[#E0E0E0] p-4 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                }}
                placeholder={
                  escalationActivated
                    ? "Message customer support..."
                    : config.placeholder || "Type your message..."
                }
                className="flex-1 min-h-[40px] max-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none overflow-y-auto"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                name="chat-message"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputMessage.trim() && !isLoading) {
                      sendMessage(
                        inputMessage,
                        config.features.streaming || false
                      );
                    }
                  }
                }}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 bg-black text-white h-[40px] flex-shrink-0"
              >
                Send
                <Send className="h-3 w-3" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Create Ticket Modal */}
      {config.chatId && config.organizationId && (
        <CreateTicketFromChatModal
          chatId={config.chatId}
          organizationId={config.organizationId}
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          onSuccess={(ticket) => {
            setShowTicketModal(false);
            // Could show a toast notification here
            console.log("Ticket created successfully:", ticket);
          }}
        />
      )}
    </>
  );
}
