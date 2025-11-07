"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Edit,
  Save,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { TypingIndicator } from "./TypingIndicator";
import { useRealtimeChat } from "../hooks/useRealtimeChat";
import type { RealtimeChatMessage } from "../hooks/useRealtimeChat";
import { CreateTicketFromChatModal } from "../tickets/CreateTicketFromChatModal";
import { EmailForm } from "./EmailForm";

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
    type?:
      | "agent_joined"
      | "agent_left"
      | "escalation_started"
      | "email_submitted"
      | string;
    agentId?: string;
    agentName?: string;
    email?: string;
    /**
     * System message visibility control:
     * - `agentOnly: true` = Only visible to agents (support view)
     * - `agentOnly: false` or undefined = Visible to both customer and agent
     *
     * Examples:
     * - agent_joined: visible to both (agentOnly: false or undefined)
     * - email_submitted: only visible to agents (agentOnly: true)
     */
    agentOnly?: boolean;
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
  autoSendFirstMessage?: string; // Display this message as an assistant message when chat opens (for new chats only, NO API call, appears on support rep side)
  className?: string;
  height?: string;

  // Features
  features: {
    streaming?: boolean;
    // escalation is always enabled - built-in feature
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

  // Chatbot Configuration (for embed/chatbot types)
  chatbotConfig?: {
    chatStartType?: "AI_ASSISTANT" | "HUMAN" | "CATEGORY_SELECT";
    customerEmailRequired?: boolean;
    staticMessage?: string;
    categorySubjects?: string[];
    hideEmailPromptMessages?: number; // Number of messages to hide before email form when email is submitted (default: 2)
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
  // Log initial config on mount
  useEffect(() => {
    console.log("=".repeat(80));
    console.log(
      "[UniversalChatInterface] 🎬 COMPONENT MOUNTED - INITIAL CONFIG:"
    );
    console.log({
      type: config.type,
      chatbotId: config.chatbotId,
      chatId: config.chatId,
      autoSendFirstMessage: config.autoSendFirstMessage,
      welcomeMessage: config.welcomeMessage,
      featuresRealtimeMode: config.features.realtimeMode,
      featuresStreaming: config.features.streaming,
      apiEndpoint: config.apiEndpoint,
      escalationEnabled: true, // Always enabled
    });
    console.log("=".repeat(80));
  }, []); // Only run once on mount

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  // Initialize loading state to true if we have a chatId (need to check if previous chats exist)
  const [isLoadingHistory, setIsLoadingHistory] = useState(
    !!config.chatId // Start loading if we have a chatId
  );

  // Track chatId internally - use config.chatId as initial value, but update from API responses
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    config.chatId
  );

  // Use a ref to track the latest chatId for synchronous access (state updates are async)
  const currentChatIdRef = useRef<string | undefined>(config.chatId);

  // Update both state and ref when chatId changes
  const updateChatId = useCallback((newChatId: string | undefined) => {
    setCurrentChatId(newChatId);
    currentChatIdRef.current = newChatId;
    console.log("[UniversalChatInterface] 📝 ChatId updated:", newChatId);
  }, []);

  // Update currentChatId when config.chatId changes (from parent)
  useEffect(() => {
    if (config.chatId) {
      updateChatId(config.chatId);
    }
  }, [config.chatId, updateChatId]);

  // Escalation state
  const [escalationRequested, setEscalationRequested] = useState(false);
  const [escalationReason, setEscalationReason] = useState<string>("");
  const [escalationActivated, setEscalationActivated] = useState(
    config.features.realtimeMode || false // If realtimeMode is enabled in config, escalation is active
  );
  const [awaitingSupport, setAwaitingSupport] = useState(false);

  // Debug: Track escalation state changes
  useEffect(() => {
    console.log("[UniversalChatInterface] 🔄 ESCALATION STATE CHANGED:", {
      escalationRequested,
      escalationReason,
      escalationActivated,
      awaitingSupport,
      configFeaturesRealtimeMode: config.features.realtimeMode,
      chatId: config.chatId,
      type: config.type,
    });
  }, [
    escalationRequested,
    escalationReason,
    escalationActivated,
    awaitingSupport,
    config.features.realtimeMode,
    config.chatId,
    config.type,
  ]);

  // Real-time chat state
  const [realtimeMode, setRealtimeMode] = useState(
    config.features.realtimeMode || false
  );

  // Debug: Track realtimeMode changes
  useEffect(() => {
    console.log("[REALTIME] 🔵 REALTIME MODE STATE:", {
      realtimeMode,
      configRealtimeMode: config.features.realtimeMode,
      currentChatId,
      escalationRequested,
      escalationActivated,
    });
  }, [
    realtimeMode,
    config.features.realtimeMode,
    currentChatId,
    escalationRequested,
    escalationActivated,
  ]);

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Email collection state
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [emailPromptMessageId, setEmailPromptMessageId] = useState<
    string | null
  >(null);
  const [responseMessageId, setResponseMessageId] = useState<string | null>(
    null
  ); // Track confirmation message ID to hide when email is submitted

  // Debug: Track email state changes
  useEffect(() => {
    console.log("[UniversalChatInterface] 📧 EMAIL STATE CHANGED:", {
      awaitingEmail,
      hasEmail,
      emailPromptMessageId,
      currentChatId,
      messagesCount: messages.length,
      chatbotConfig: config.chatbotConfig,
    });
  }, [
    awaitingEmail,
    hasEmail,
    emailPromptMessageId,
    currentChatId,
    messages.length,
    config.chatbotConfig,
  ]);

  // Safety check: Ensure hasEmail and awaitingEmail are consistent
  // If hasEmail is true, awaitingEmail should be false
  useEffect(() => {
    if (hasEmail && awaitingEmail) {
      console.log(
        "[UniversalChatInterface] ⚠️ Inconsistent email state - fixing:",
        {
          hasEmail,
          awaitingEmail,
          willSetAwaitingEmail: false,
        }
      );
      setAwaitingEmail(false);
    }
  }, [hasEmail, awaitingEmail]);

  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryList, setShowCategoryList] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time chat hook - handles message broadcasting
  const {
    sendMessage: sendRealtimeMessage,
    isConnected: wsConnected,
    error: wsError,
  } = useRealtimeChat({
    chatId: currentChatId || "",
    enabled: realtimeMode && !!currentChatId,
    onConnected: () => {
      console.log("[REALTIME] ✅ WEBSOCKET CONNECTED (callback)");
    },
    onDisconnected: () => {
      console.log("[REALTIME] ⚠️ WEBSOCKET DISCONNECTED (callback)");
    },
    onMessage: (message: RealtimeChatMessage) => {
      // Add incoming real-time message to messages array
      console.log("[REALTIME] 🟢 RECEIVED MESSAGE:", {
        id: message.id,
        role: message.role,
        content: message.content.substring(0, 50),
        sender: message.sender.name,
        senderId: message.sender.id,
        timestamp: message.timestamp,
      });

      const chatMessage: ChatMessage = {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: new Date(message.timestamp),
        userId: message.sender.id, // Include sender ID for message alignment
      };

      setMessages((prev) => {
        // Check if message already exists by ID (avoid duplicates from API responses)
        const existsById = prev.some((msg) => msg.id === message.id);
        if (existsById) {
          console.log("[REALTIME] ⚠️ Message already exists by ID, skipping:", {
            messageId: message.id,
            currentMessagesCount: prev.length,
          });
          return prev;
        }

        // If this is from the current user, check if we already have an optimistic message with the same content
        // This prevents duplicates when the user's own message comes back via WebSocket
        if (message.sender.id === config.currentUserId) {
          const hasOptimisticWithSameContent = prev.some(
            (msg) =>
              msg.id.startsWith("optimistic_") &&
              msg.content === message.content &&
              msg.role === message.role
          );

          if (hasOptimisticWithSameContent) {
            console.log(
              "[REALTIME] ⚠️ Message from current user already exists as optimistic, replacing:",
              {
                messageId: message.id,
                content: message.content.substring(0, 50),
                currentMessagesCount: prev.length,
              }
            );

            // Remove optimistic message and add the real one
            const withoutOptimistic = prev.filter(
              (msg) =>
                !(
                  msg.id.startsWith("optimistic_") &&
                  msg.content === message.content &&
                  msg.role === message.role
                )
            );

            return [...withoutOptimistic, chatMessage];
          }
        }

        console.log("[REALTIME] 🟢 ADDING MESSAGE TO UI:", {
          messageId: message.id,
          beforeCount: prev.length,
          willBeCount: prev.length + 1,
        });

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

    onMessageUpdated: (message: {
      id: string;
      content: string;
      role: "user" | "assistant" | "agent" | "system";
      timestamp: Date;
      updatedAt: Date;
      sender: {
        id: string;
        name: string;
        email?: string | null;
        avatar?: string | null;
      };
    }) => {
      // Handle real-time message updates
      console.log("[UniversalChatInterface] Received message update:", {
        id: message.id,
        content: message.content,
        role: message.role,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? {
                ...msg,
                content: message.content,
              }
            : msg
        )
      );

      // Exit edit mode if we were editing this message
      if (editingMessageId === message.id) {
        setEditingMessageId(null);
        setEditingContent("");
      }
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
            agentOnly: false, // Visible to both customer and agent
          },
        };

        console.log("✅ Agent joined message added to chat (real-time)");
        return [...prev, systemMessage];
      });
    },
    onError: (error) => {
      console.error("[REALTIME] ❌ WEBSOCKET ERROR:", error);
    },
  });

  // Reset loading state and messages when chatId changes
  useEffect(() => {
    if (config.chatId) {
      // When opening a new chat, reset state and show loading
      setIsLoadingHistory(true);
      setMessages([]);
    } else {
      // When chatId is cleared (new chat), reset loading state
      setIsLoadingHistory(false);
    }
  }, [config.chatId]);

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
          const response = await fetch(`${endpoint}`);
          if (response.ok) {
            const data = await response.json();
            setChatInfo(data);
          }

          // For embed chats without chatId, create chat and auto-send first message if configured
          if (
            config.type === "embed" &&
            !currentChatId &&
            config.autoSendFirstMessage &&
            config.chatbotId
          ) {
            console.log(
              "[UniversalChatInterface] 🚀 Creating new chat and auto-sending first message:",
              {
                chatbotId: config.chatbotId,
                autoSendFirstMessage: config.autoSendFirstMessage.substring(
                  0,
                  50
                ),
              }
            );
            setIsLoadingHistory(true);
            try {
              // Create chat and auto-send first message
              const createResponse = await fetch(
                `/api/embed/chatbots/${config.chatbotId}/save-message`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: config.autoSendFirstMessage,
                    chatId: null, // Create new chat
                  }),
                }
              );

              if (createResponse.ok) {
                const createData = await createResponse.json();
                if (createData.success && createData.chatId) {
                  console.log(
                    "[UniversalChatInterface] ✅ Chat created with auto-sent first message:",
                    {
                      chatId: createData.chatId,
                      messageId: createData.message.id,
                    }
                  );
                  // Update chatId
                  updateChatId(createData.chatId);
                  // Notify parent
                  if (config.onChatCreated) {
                    config.onChatCreated(createData.chatId);
                  }

                  // Load chat history to show the auto-sent first message
                  const chatResponse = await fetch(
                    `/api/embed/chats/${createData.chatId}`
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

                    // Deduplicate messages by ID to prevent duplicates
                    const uniqueMessages = mappedMessages.reduce(
                      (acc: ChatMessage[], msg: ChatMessage) => {
                        const exists = acc.some(
                          (existing) => existing.id === msg.id
                        );
                        if (!exists) {
                          acc.push(msg);
                        } else {
                          console.log(
                            "[UniversalChatInterface] ⚠️ Duplicate message detected and removed:",
                            {
                              messageId: msg.id,
                              content: msg.content.substring(0, 50),
                            }
                          );
                        }
                        return acc;
                      },
                      []
                    );

                    // Sort by timestamp to ensure correct order
                    uniqueMessages.sort(
                      (a: ChatMessage, b: ChatMessage) =>
                        new Date(a.timestamp).getTime() -
                        new Date(b.timestamp).getTime()
                    );

                    setMessages(uniqueMessages);
                    console.log(
                      "[UniversalChatInterface] ✅ Loaded chat history with auto-sent first message:",
                      {
                        chatId: createData.chatId,
                        messagesCount: mappedMessages.length,
                      }
                    );
                  }
                }
              } else {
                console.error(
                  "[UniversalChatInterface] ❌ Failed to create chat:",
                  await createResponse.text()
                );
              }
            } catch (error) {
              console.error(
                "[UniversalChatInterface] ❌ Error creating chat:",
                error
              );
            } finally {
              setIsLoadingHistory(false);
            }
          }
          // For embed chats with chatId, also load existing messages
          else if (config.type === "embed" && currentChatId) {
            setIsLoadingHistory(true); // Start loading
            try {
              const chatResponse = await fetch(
                `/api/embed/chats/${currentChatId}`
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

                // Deduplicate messages by ID to prevent duplicates
                const uniqueMessages = mappedMessages.reduce(
                  (acc: ChatMessage[], msg: ChatMessage) => {
                    const exists = acc.some(
                      (existing) => existing.id === msg.id
                    );
                    if (!exists) {
                      acc.push(msg);
                    } else {
                      console.log(
                        "[UniversalChatInterface] ⚠️ Duplicate message detected and removed:",
                        {
                          messageId: msg.id,
                          content: msg.content.substring(0, 50),
                        }
                      );
                    }
                    return acc;
                  },
                  []
                );

                // Sort by timestamp to ensure correct order
                uniqueMessages.sort(
                  (a: ChatMessage, b: ChatMessage) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
                );

                setMessages(uniqueMessages);

                // Update chat info with escalation status
                if (chatData.escalationRequested) {
                  console.log(
                    "[REALTIME] 🔵 CHAT IS ESCALATED - ENABLING REAL-TIME MODE:",
                    {
                      chatId: chatData.id,
                      escalationRequested: chatData.escalationRequested,
                      escalationReason: chatData.escalationReason,
                    }
                  );
                  setEscalationRequested(true);
                  setEscalationReason(chatData.escalationReason || "");
                  setEscalationActivated(true);
                  // Enable real-time mode if chat is escalated
                  setRealtimeMode(true);
                } else {
                  console.log(
                    "[REALTIME] ⚪ CHAT NOT ESCALATED - USING AI MODE:",
                    {
                      chatId: chatData.id,
                      escalationRequested: chatData.escalationRequested,
                    }
                  );
                }

                // Check if email has been collected
                console.log(
                  "[UniversalChatInterface] 📧 EMAIL CHECK (loading chat):",
                  {
                    hasMetadata: !!chatData.metadata,
                    metadata: chatData.metadata,
                    customerEmail: chatData.metadata?.customerEmail,
                    messagesCount: mappedMessages.length,
                  }
                );

                // Check if email is already submitted
                console.log(
                  "[UniversalChatInterface] 🔍 CHECKING EMAIL IN METADATA:",
                  {
                    hasMetadata: !!chatData.metadata,
                    metadataType: typeof chatData.metadata,
                    metadataKeys: chatData.metadata
                      ? Object.keys(chatData.metadata)
                      : [],
                    rawMetadata: chatData.metadata,
                    customerEmail: chatData.metadata?.customerEmail,
                    customerEmailType: typeof chatData.metadata?.customerEmail,
                    customerEmailTruthy: !!chatData.metadata?.customerEmail,
                  }
                );
                const hasEmailInMetadata = !!chatData.metadata?.customerEmail;
                console.log(
                  "[UniversalChatInterface] 📧 EMAIL METADATA CHECK RESULT:",
                  {
                    hasEmailInMetadata,
                    willSetHasEmail: hasEmailInMetadata,
                    willSetAwaitingEmail: !hasEmailInMetadata,
                  }
                );
                if (hasEmailInMetadata) {
                  console.log(
                    "[UniversalChatInterface] ✅ Email already collected - SETTING STATE:",
                    {
                      email: chatData.metadata.customerEmail,
                      willSetHasEmail: true,
                      willSetAwaitingEmail: false,
                      currentHasEmail: hasEmail,
                      currentAwaitingEmail: awaitingEmail,
                    }
                  );
                  // Explicitly set state to ensure form doesn't show
                  setHasEmail(true);
                  setAwaitingEmail(false);
                  console.log(
                    "[UniversalChatInterface] ✅ STATE SET - hasEmail=true, awaitingEmail=false"
                  );
                } else {
                  console.log(
                    "[UniversalChatInterface] ⚠️ No email in metadata - SETTING STATE:",
                    {
                      willSetHasEmail: false,
                      currentHasEmail: hasEmail,
                      currentAwaitingEmail: awaitingEmail,
                    }
                  );
                  // Make sure hasEmail is false if email isn't in metadata
                  setHasEmail(false);
                }

                // Check if we're awaiting email (look for email prompt message)
                // We need to find this even if email is submitted, so we can hide the messages
                const emailPromptMsg = mappedMessages.find(
                  (msg: ChatMessage) =>
                    msg.role === "assistant" &&
                    msg.content.includes("business email address")
                );
                console.log(
                  "[UniversalChatInterface] 🔍 EMAIL PROMPT MESSAGE SEARCH:",
                  {
                    foundEmailPrompt: !!emailPromptMsg,
                    emailPromptMsgId: emailPromptMsg?.id,
                    emailPromptMsgContent: emailPromptMsg?.content,
                    hasCustomerEmail: hasEmailInMetadata,
                  }
                );

                // Always track email prompt message ID if found (needed for hiding messages)
                // Keep this even when email is submitted so we can hide the messages
                if (emailPromptMsg) {
                  setEmailPromptMessageId(emailPromptMsg.id);

                  // Find confirmation message (the one before email prompt) to track for hiding
                  const emailPromptIndex = mappedMessages.findIndex(
                    (msg) => msg.id === emailPromptMsg.id
                  );
                  if (emailPromptIndex > 0) {
                    const confirmationMsg =
                      mappedMessages[emailPromptIndex - 1];
                    if (
                      confirmationMsg.role === "assistant" &&
                      confirmationMsg.content.includes("I'd be happy to help")
                    ) {
                      setResponseMessageId(confirmationMsg.id);
                      console.log(
                        "[UniversalChatInterface] 📧 Found confirmation message to hide:",
                        {
                          responseMessageId: confirmationMsg.id,
                          messageContent: confirmationMsg.content.substring(
                            0,
                            50
                          ),
                        }
                      );
                    }
                  }
                }

                // Only set awaiting email if email hasn't been submitted yet
                if (emailPromptMsg && !hasEmailInMetadata) {
                  console.log(
                    "[UniversalChatInterface] 📧 Setting awaiting email state:",
                    {
                      emailPromptMessageId: emailPromptMsg.id,
                      emailPromptContent: emailPromptMsg.content,
                    }
                  );
                  setAwaitingEmail(true);
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
      } else if (config.type === "traditional" && currentChatId) {
        setIsLoadingHistory(true); // Start loading
        try {
          const response = await fetch(`/api/chats/${currentChatId}`);
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

            // Deduplicate messages by ID to prevent duplicates
            const uniqueMessages = mappedMessages.reduce(
              (acc: ChatMessage[], msg: ChatMessage) => {
                const exists = acc.some((existing) => existing.id === msg.id);
                if (!exists) {
                  acc.push(msg);
                } else {
                  console.log(
                    "[UniversalChatInterface] ⚠️ Duplicate message detected and removed:",
                    {
                      messageId: msg.id,
                      content: msg.content.substring(0, 50),
                    }
                  );
                }
                return acc;
              },
              []
            );

            // Sort by timestamp to ensure correct order
            uniqueMessages.sort(
              (a: ChatMessage, b: ChatMessage) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );

            setMessages(uniqueMessages);

            // Update escalation status if chat is already escalated
            if (data.escalationRequested) {
              console.log(
                "[REALTIME] 🔵 ESCALATION DETECTED IN RESPONSE - ENABLING REAL-TIME MODE:",
                {
                  escalationRequested: data.escalationRequested,
                  escalationReason: data.escalationReason,
                  chatId: currentChatId,
                }
              );
              setEscalationRequested(true);
              setEscalationReason(data.escalationReason || "");
              setEscalationActivated(true); // Set escalation as activated
              // Enable real-time mode if chat is escalated
              setRealtimeMode(true);
            }
          }
        } catch (error) {
          console.error("Error loading chat info:", error);
        } finally {
          setIsLoadingHistory(false); // Done loading
        }
      } else if (config.chatId) {
        // If we have a chatId but didn't enter any loading branch, reset loading state
        // This handles edge cases where type doesn't match or chatbotId is missing
        setIsLoadingHistory(false);
      }
    };

    loadChatInfo();
  }, [config.type, config.chatbotId, config.chatId, currentChatId]);

  // Initialize category selection and email collection based on chatbot config
  useEffect(() => {
    if (
      config.type === "embed" &&
      config.chatbotConfig?.chatStartType === "CATEGORY_SELECT" &&
      !config.chatId &&
      !isLoadingHistory &&
      messages.length === 0
    ) {
      setShowCategoryList(true);
    }
  }, [
    config.type,
    config.chatbotConfig?.chatStartType,
    config.chatId,
    isLoadingHistory,
    messages.length,
  ]);

  // Show welcome message (only for NEW chats, not when loading existing chat)
  useEffect(() => {
    console.log("[UniversalChatInterface] 👋 WELCOME MESSAGE CHECK:", {
      hasWelcomeMessage: !!config.welcomeMessage,
      welcomeMessage: config.welcomeMessage,
      hasShownWelcome,
      messagesLength: messages.length,
      hasChatId: !!config.chatId,
      isLoadingHistory,
      chatId: config.chatId,
      type: config.type,
    });
    if (
      config.welcomeMessage &&
      !hasShownWelcome &&
      messages.length === 0 &&
      !config.chatId && // Only show for new chats
      !isLoadingHistory // Not while loading existing chat
    ) {
      console.log(
        "[UniversalChatInterface] ✅ Showing welcome message:",
        config.welcomeMessage
      );
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

  // Note: Auto-send first message is now handled automatically in the API route
  // when creating a new chat. The message will be loaded when chat history is fetched.

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
    console.log("[UniversalChatInterface] 🚀 SEND MESSAGE CALLED:", {
      message: message.substring(0, 50),
      isLoading,
      realtimeMode,
      currentChatId,
      configType: config.type,
      hasAutoSendFirstMessage: !!config.autoSendFirstMessage,
      autoSendFirstMessage: config.autoSendFirstMessage,
    });

    if (!message.trim() || isLoading) return;

    console.log("[REALTIME] 🔵 SEND MESSAGE CALLED:", {
      message: message.substring(0, 50),
      realtimeMode,
      currentChatId,
      willUseRealtime: realtimeMode && !!currentChatId,
      useStreaming,
    });

    // REAL-TIME MODE: Route to real-time chat system
    if (realtimeMode && currentChatId) {
      const messageRole = config.features.supportView ? "ASSISTANT" : "USER";

      console.log("[REALTIME] 🔵 ROUTING TO REAL-TIME MODE:", {
        messageRole,
        chatId: currentChatId,
        supportView: config.features.supportView,
        wsConnected,
        wsError,
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
        console.log("[REALTIME] 🔵 CALLING sendRealtimeMessage:", {
          message: message.substring(0, 50),
          messageRole,
          chatId: currentChatId,
        });

        const success = await sendRealtimeMessage(message, messageRole);

        if (!success) {
          throw new Error("Failed to send real-time message");
        }

        console.log("[REALTIME] ✅ Message sent successfully via WebSocket");
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

    console.log("[REALTIME] ⚪ USING AI MODE (not real-time):", {
      realtimeMode,
      currentChatId,
      escalationRequested,
      escalationActivated,
      willUseAI: true,
    });

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
    // Start with typing indicator, will switch to streaming when response starts
    setIsStreaming(false);
    setStreamingContent("");

    try {
      const requestBody: {
        message: string;
        conversationHistory: ChatMessage[];
        organizationId?: string;
        stream?: boolean;
        chatId?: string;
        role?: string;
        config?: { autoSendFirstMessage?: string };
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
        // Always send chatId if available - use ref for synchronous access to latest value
        const chatIdToSend = currentChatIdRef.current || currentChatId;
        requestBody.chatId = chatIdToSend;
        // Include config for auto-send first message (only when creating new chat)
        if (config.autoSendFirstMessage && !chatIdToSend) {
          requestBody.config = {
            autoSendFirstMessage: config.autoSendFirstMessage,
          };
        }
        console.log("📤 Sending message with chatId:", {
          fromRef: currentChatIdRef.current,
          fromState: currentChatId,
          final: chatIdToSend,
          hasAutoSendFirstMessage: !!config.autoSendFirstMessage,
        });
      } else if (config.type === "traditional") {
        requestBody.chatId = config.chatId || undefined;
        requestBody.role = config.features.supportView ? "ASSISTANT" : "USER";
      }

      console.log("[UniversalChatInterface] Calling AI API:", {
        endpoint: config.apiEndpoint,
        chatId: currentChatId,
        configChatId: config.chatId,
        type: config.type,
      });
      console.log("[UniversalChatInterface] 📧 API REQUEST BODY:", {
        message: message.substring(0, 50),
        stream: useStreaming,
        chatId: requestBody.chatId,
        conversationHistoryLength: requestBody.conversationHistory.length,
        hasConfig: !!requestBody.config,
        config: requestBody.config,
        autoSendFirstMessage: config.autoSendFirstMessage,
      });

      const response = await fetch(`${config.apiEndpoint}`, {
        method: config.apiMethod || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[UniversalChatInterface] 📧 API RESPONSE RECEIVED:", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        isStreaming: response.headers
          .get("content-type")
          ?.includes("text/event-stream"),
      });

      if (!response.ok) {
        // Try to get error details from response body
        // Clone response first so we can read it without consuming the original
        const responseClone = response.clone();
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await responseClone.json();
          errorDetails = errorBody.error || errorDetails;
          if (errorBody.details) {
            errorDetails += ` - ${errorBody.details}`;
          }
          console.error("[UniversalChatInterface] API Error Response:", {
            status: response.status,
            statusText: response.statusText,
            error: errorBody,
            endpoint: config.apiEndpoint,
            requestBody: {
              message: requestBody.message,
              chatId: requestBody.chatId,
              stream: requestBody.stream,
            },
          });
        } catch (parseError) {
          // If we can't parse as JSON, try to read as text
          try {
            const responseText = await responseClone.text();
            console.error("[UniversalChatInterface] API Error (unparseable):", {
              status: response.status,
              statusText: response.statusText,
              responseText: responseText.substring(0, 500), // Limit log size
              endpoint: config.apiEndpoint,
            });
          } catch (textError) {
            console.error("[UniversalChatInterface] API Error (unreadable):", {
              status: response.status,
              statusText: response.statusText,
              endpoint: config.apiEndpoint,
              parseError,
              textError,
            });
          }
        }
        throw new Error(errorDetails);
      }

      // Check actual response content-type, not just request parameter
      const contentType = response.headers.get("content-type") || "";
      const isActuallyStreaming = contentType.includes("text/event-stream");

      console.log("[REALTIME] ⚪ RESPONSE TYPE CHECK:", {
        useStreaming,
        configStreaming: config.features.streaming,
        contentType,
        isActuallyStreaming,
        willUseStreaming: isActuallyStreaming,
      });

      if (isActuallyStreaming) {
        // Enable streaming mode - typing indicator will be replaced by streaming content
        setIsStreaming(true);
        await handleStreamingResponse(response);
      } else {
        // Regular response - typing indicator will be replaced by the response
        setIsStreaming(false);
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
    console.log("[REALTIME] ⚪ HANDLE STREAMING RESPONSE START (AI MODE)");
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
                console.log(
                  "[REALTIME] ⚪ STREAMING COMPLETE - ADDING AI RESPONSE TO UI:",
                  {
                    messageId: assistantMessage.id,
                    contentLength: fullContent.length,
                    content: fullContent.substring(0, 50),
                  }
                );
                setMessages((prev) => {
                  const newMessages = [...prev, assistantMessage!];
                  console.log("[REALTIME] ⚪ AI RESPONSE ADDED TO UI:", {
                    messageId: assistantMessage!.id,
                    beforeCount: prev.length,
                    afterCount: newMessages.length,
                  });
                  return newMessages;
                });

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
              if (parsed.chatId) {
                // Update internal chatId state
                if (!currentChatIdRef.current) {
                  updateChatId(parsed.chatId);
                  console.log(
                    "📝 Chat ID captured from streaming:",
                    parsed.chatId
                  );
                  // Notify parent component
                  if (config.onChatCreated) {
                    config.onChatCreated(parsed.chatId);
                  }

                  // Note: Auto-sent first message is now created when chat opens, not when user sends first message
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

              // Check for escalation - log EVERY chunk that has escalation data
              if (parsed.escalationRequested !== undefined) {
                console.log(
                  "[UniversalChatInterface] 🔍 ESCALATION CHECK (streaming):",
                  {
                    isComplete: parsed.isComplete,
                    parsedEscalationRequested: parsed.escalationRequested,
                    parsedEscalationReason: parsed.escalationReason,
                    currentEscalationRequested: escalationRequested,
                    currentEscalationActivated: escalationActivated,
                    chatId: config.chatId,
                    type: config.type,
                    rawParsed: parsed, // Log entire parsed object
                  }
                );
              }

              // Check for email requirement in streaming response
              if (parsed.isComplete && parsed.requiresEmail !== undefined) {
                console.log(
                  "[UniversalChatInterface] 📧 EMAIL REQUIREMENT CHECK (streaming):",
                  {
                    requiresEmail: parsed.requiresEmail,
                    emailPromptMessageId: parsed.emailPromptMessageId,
                    hasEmail,
                    currentAwaitingEmail: awaitingEmail,
                    isComplete: parsed.isComplete,
                  }
                );

                if (parsed.requiresEmail && !hasEmail) {
                  console.log(
                    "[UniversalChatInterface] 📧 Setting awaiting email from streaming response:",
                    {
                      emailPromptMessageId: parsed.emailPromptMessageId,
                      requiresEmail: parsed.requiresEmail,
                      hasEmail,
                    }
                  );
                  setAwaitingEmail(true);
                  if (parsed.emailPromptMessageId) {
                    setEmailPromptMessageId(parsed.emailPromptMessageId);
                  }
                }
              }

              // Escalation is always enabled - detect and set state if present
              if (parsed.isComplete && parsed.escalationRequested) {
                console.log(
                  "[UniversalChatInterface] 🚨 ESCALATION DETECTED (streaming):",
                  {
                    escalationRequested: parsed.escalationRequested,
                    escalationReason: parsed.escalationReason,
                    escalationActivated,
                    currentEscalationRequested: escalationRequested,
                    chatId: config.chatId,
                    type: config.type,
                    willSetEscalation: true,
                  }
                );
                setEscalationRequested(true);
                setEscalationReason(
                  parsed.escalationReason || "User requested human assistance"
                );
                console.log(
                  "[UniversalChatInterface] ✅ Escalation state updated (streaming):",
                  {
                    escalationRequested: true,
                    escalationReason:
                      parsed.escalationReason ||
                      "User requested human assistance",
                  }
                );
              } else if (parsed.escalationRequested && !parsed.isComplete) {
                console.log(
                  "[UniversalChatInterface] ⏳ ESCALATION DETECTED BUT NOT COMPLETE (streaming):",
                  {
                    isComplete: parsed.isComplete,
                    escalationRequested: parsed.escalationRequested,
                    waitingForComplete: true,
                  }
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
    console.log("[REALTIME] ⚪ HANDLE REGULAR RESPONSE START (AI MODE)");
    const data = await response.json();

    console.log("[UniversalChatInterface] 📦 RAW API RESPONSE (regular):", {
      success: data.success,
      hasEscalationRequested: data.escalationRequested !== undefined,
      escalationRequested: data.escalationRequested,
      escalationReason: data.escalationReason,
      requiresEmail: data.requiresEmail, // ADDED: Check for email requirement
      emailPromptMessageId: data.emailPromptMessageId, // ADDED: Check for email prompt ID
      responseMessageId: data.responseMessageId, // ADDED: Check for response message ID
      chatId: data.chatId,
      fullResponse: data, // Log entire response for debugging
    });

    if (data.success) {
      // Use responseMessageId from API if available (for category responses), otherwise generate one
      const assistantMessage: ChatMessage = {
        id: data.responseMessageId || `assistant_${Date.now()}`,
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

      console.log("[UniversalChatInterface] 📧 Adding assistant message:", {
        messageId: assistantMessage.id,
        messageIdSource: data.responseMessageId
          ? "API (responseMessageId)"
          : "Generated",
        responseMessageId: data.responseMessageId,
        messageContent: assistantMessage.content.substring(0, 100),
        containsEmailPrompt: assistantMessage.content.includes(
          "business email address"
        ),
        requiresEmail: data.requiresEmail,
        emailPromptMessageId: data.emailPromptMessageId,
        fullResponseData: data,
      });

      // Track responseMessageId if this is the confirmation message (before email prompt)
      if (data.responseMessageId && data.requiresEmail) {
        setResponseMessageId(data.responseMessageId);
        console.log(
          "[UniversalChatInterface] 📧 Tracking responseMessageId for hiding:",
          {
            responseMessageId: data.responseMessageId,
            messageContent: assistantMessage.content.substring(0, 50),
          }
        );
      }

      // Note: Auto-sent first message is now created when chat opens, not when user sends first message
      // Just add the assistant message
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        console.log(
          "[UniversalChatInterface] 📧 Messages after adding assistant:",
          {
            totalMessages: newMessages.length,
            lastMessageId: assistantMessage.id,
            lastMessageContent: assistantMessage.content.substring(0, 50),
          }
        );
        return newMessages;
      });

      // Notify parent of received message (for localStorage updates in embed mode)
      if (config.onMessageReceived) {
        config.onMessageReceived(assistantMessage);
      }

      // Update chat info for new chats
      // Note: Auto-sent first message is now created when chat opens, not when user sends first message
      if (data.chatId) {
        // Update internal chatId state
        updateChatId(data.chatId);
        console.log("📝 Chat ID captured from response:", data.chatId);
        // Notify parent component
        if (config.onChatCreated) {
          config.onChatCreated(data.chatId);
        }
      }
      if (data.chat) {
        setChatInfo(data.chat);
      }

      // Check if email is required
      console.log(
        "[UniversalChatInterface] 📧 EMAIL REQUIREMENT CHECK (regular response):",
        {
          requiresEmail: data.requiresEmail,
          hasEmail,
          emailPromptMessageId: data.emailPromptMessageId,
          currentAwaitingEmail: awaitingEmail,
          currentEmailPromptMessageId: emailPromptMessageId,
          responseData: data,
          assistantMessageId: assistantMessage.id,
        }
      );

      if (data.requiresEmail && !hasEmail) {
        // The API creates a separate email prompt message
        // We need to add it to the messages array
        if (data.emailPromptMessageId) {
          const emailPromptMessage: ChatMessage = {
            id: data.emailPromptMessageId,
            role: "assistant",
            content:
              "In case we get disconnected, what's your business email address?",
            timestamp: new Date(),
          };

          console.log(
            "[UniversalChatInterface] 📧 Adding email prompt message:",
            {
              emailPromptMessageId: data.emailPromptMessageId,
              emailPromptMessage,
            }
          );

          setMessages((prev) => {
            const newMessages = [...prev, emailPromptMessage];
            console.log(
              "[UniversalChatInterface] 📧 Messages after adding email prompt:",
              {
                totalMessages: newMessages.length,
                emailPromptMessageId: emailPromptMessage.id,
              }
            );
            return newMessages;
          });
        }

        // Use the emailPromptMessageId from API
        const promptMessageId =
          data.emailPromptMessageId || assistantMessage.id;

        console.log(
          "[UniversalChatInterface] 📧 Setting awaiting email from API response:",
          {
            emailPromptMessageId: data.emailPromptMessageId,
            assistantMessageId: assistantMessage.id,
            usingPromptMessageId: promptMessageId,
            requiresEmail: data.requiresEmail,
            hasEmail,
          }
        );
        setAwaitingEmail(true);
        setEmailPromptMessageId(promptMessageId);
      }

      // Check for escalation - escalation is always enabled
      console.log("[UniversalChatInterface] 🔍 ESCALATION CHECK (regular):", {
        dataEscalationRequested: data.escalationRequested,
        dataEscalationReason: data.escalationReason,
        currentEscalationRequested: escalationRequested,
        currentEscalationActivated: escalationActivated,
        chatId: config.chatId,
        type: config.type,
      });

      if (data.escalationRequested) {
        console.log(
          "[UniversalChatInterface] 🚨 ESCALATION DETECTED (regular):",
          {
            escalationRequested: data.escalationRequested,
            escalationReason: data.escalationReason,
            escalationActivated,
            currentEscalationRequested: escalationRequested,
            chatId: config.chatId,
            type: config.type,
            willSetEscalation: true,
          }
        );
        setEscalationRequested(true);
        setEscalationReason(
          data.escalationReason || "User requested human assistance"
        );
        console.log(
          "[UniversalChatInterface] ✅ Escalation state updated (regular):",
          {
            escalationRequested: true,
            escalationReason:
              data.escalationReason || "User requested human assistance",
          }
        );
      } else {
        console.log(
          "[UniversalChatInterface] ℹ️ NO ESCALATION IN RESPONSE (regular):",
          {
            dataEscalationRequested: data.escalationRequested,
          }
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

  const handleEmailSubmitted = useCallback(
    async (email: string) => {
      console.log("[UniversalChatInterface] 📧 EMAIL SUBMITTED:", {
        email,
        currentChatId,
        messagesCount: messages.length,
        awaitingEmail,
        emailPromptMessageId,
      });

      // Capture emailPromptMessageId before clearing it (needed for filtering)
      const emailPromptId = emailPromptMessageId;

      // Hide email form immediately
      setHasEmail(true);
      setAwaitingEmail(false);
      setEmailPromptMessageId(null);

      // Find the last user message before the email prompt
      const lastUserMessage = messages
        .slice()
        .reverse()
        .find((msg) => msg.role === "user");

      console.log("[UniversalChatInterface] 📧 Resuming chat after email:", {
        foundLastUserMessage: !!lastUserMessage,
        lastUserMessageContent: lastUserMessage?.content,
        currentChatId,
      });

      if (!lastUserMessage || !currentChatId) {
        console.warn(
          "[UniversalChatInterface] ⚠️ Cannot resume chat - missing lastUserMessage or currentChatId:",
          {
            hasLastUserMessage: !!lastUserMessage,
            hasCurrentChatId: !!currentChatId,
          }
        );
        return;
      }

      // Resume chat by calling API directly without adding user message again
      // Use a small delay to ensure email is saved in the database
      setTimeout(async () => {
        try {
          console.log(
            "[UniversalChatInterface] 📧 Resuming chat after email submission:",
            {
              message: lastUserMessage.content,
              chatId: currentChatId,
              willNotAddUserMessage: true,
            }
          );

          // Set loading state immediately to show typing indicator
          setIsLoading(true);
          setIsStreaming(false); // Start with typing indicator, then switch to streaming if enabled
          setStreamingContent("");

          // Filter out email prompt messages from conversation history
          // Use the captured emailPromptId if available, otherwise filter by content
          const filteredMessages = messages.filter((msg) => {
            // Don't include email prompt messages in the conversation history
            if (emailPromptId && msg.id === emailPromptId) {
              return false;
            }
            if (
              msg.role === "assistant" &&
              msg.content.includes("business email address")
            ) {
              return false;
            }
            return true;
          });

          const requestBody: {
            message: string;
            conversationHistory: ChatMessage[];
            stream?: boolean;
            chatId?: string;
            skipUserMessage?: boolean; // Flag to prevent duplicate user message creation
          } = {
            message: lastUserMessage.content,
            conversationHistory: filteredMessages,
            stream: config.features.streaming || false,
            chatId: currentChatId,
            skipUserMessage: true, // Don't create duplicate user message - it already exists
          };

          console.log(
            "[UniversalChatInterface] 📧 API REQUEST (resume after email):",
            {
              message: lastUserMessage.content.substring(0, 50),
              stream: requestBody.stream,
              chatId: requestBody.chatId,
              conversationHistoryLength: requestBody.conversationHistory.length,
            }
          );

          const response = await fetch(`${config.apiEndpoint}`, {
            method: config.apiMethod || "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          console.log(
            "[UniversalChatInterface] 📧 API RESPONSE RECEIVED (resume after email):",
            {
              ok: response.ok,
              status: response.status,
              contentType: response.headers.get("content-type"),
              isStreaming: response.headers
                .get("content-type")
                ?.includes("text/event-stream"),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Check if response is streaming
          const contentType = response.headers.get("content-type") || "";
          const isActuallyStreaming = contentType.includes("text/event-stream");

          if (isActuallyStreaming) {
            // Enable streaming mode - typing indicator will be replaced by streaming content
            setIsStreaming(true);
            await handleStreamingResponse(response);
          } else {
            // Regular response - typing indicator will be replaced by the response
            setIsStreaming(false);
            await handleRegularResponse(response);
          }
        } catch (error) {
          console.error(
            "[UniversalChatInterface] ❌ Error resuming chat after email:",
            error
          );
          const errorMessage: ChatMessage = {
            id: `error_${Date.now()}`,
            role: "assistant",
            content:
              "Sorry, I encountered an error while resuming the chat. Please try again.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
          setIsStreaming(false);
          setStreamingContent("");
        }
      }, 500);
    },
    [
      messages,
      config.features.streaming,
      config.apiEndpoint,
      config.apiMethod,
      currentChatId,
      emailPromptMessageId,
    ]
  );

  const handleCategorySelect = useCallback(
    (category: string) => {
      console.log("[UniversalChatInterface] Category selected:", category);
      setSelectedCategory(category);
      setShowCategoryList(false);
      // Send category as a message
      sendMessage(category, config.features.streaming || false);
    },
    [config.features.streaming, sendMessage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Don't allow sending messages if awaiting email
    if (awaitingEmail) {
      return;
    }
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
      const escalationResponse = await fetch(`/api/escalations`, {
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
      console.log(
        "[REALTIME] 🔵 ESCALATION REQUESTED - ENABLING REAL-TIME MODE:",
        {
          chatId: config.chatId,
          currentChatId,
          escalationReason:
            escalationReason || "User requested human assistance",
        }
      );
      setRealtimeMode(true);

      console.log(
        "[REALTIME] ✅ Real-time mode activated - waiting for agent to join"
      );
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

  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !config.chatId || !editingContent.trim()) {
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(
        `/api/chats/${config.chatId}/messages/${editingMessageId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: editingContent.trim(),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update message");
      }

      const data = await response.json();

      // Update the message in the messages array
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                content: data.message.content,
              }
            : msg
        )
      );

      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      console.error("Error updating message:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update message. Please try again."
      );
    } finally {
      setIsSavingEdit(false);
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
            {/* Loading state - show when fetching previous chats */}
            {isLoadingHistory && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarLoader
                  color="#000"
                  height={4}
                  width={100}
                  className="mb-4"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Loading chat...
                </p>
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

            {/* Category Selection UI - only show when no messages and category list should be shown */}
            {showCategoryList &&
              !isLoadingHistory &&
              messages.length === 0 &&
              config.chatbotConfig?.categorySubjects &&
              config.chatbotConfig.categorySubjects.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-center">
                    How can we help you today?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {config.chatbotConfig.categorySubjects.map(
                      (category, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3 px-4"
                          onClick={() => handleCategorySelect(category)}
                        >
                          {category}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              )}

            {(() => {
              // Filter messages to hide when email is submitted
              console.log(
                "[UniversalChatInterface] 🔍 MESSAGE FILTERING START:",
                {
                  hasEmail,
                  awaitingEmail,
                  emailPromptMessageId,
                  totalMessages: messages.length,
                  hideEmailPromptMessages:
                    config.chatbotConfig?.hideEmailPromptMessages ?? 2,
                }
              );
              const hideEmailPromptMessages =
                config.chatbotConfig?.hideEmailPromptMessages ?? 2; // Default: hide 2 messages
              const messagesToHide = new Set<string>();

              if (hasEmail) {
                console.log(
                  "[UniversalChatInterface] ✅ hasEmail is TRUE - will hide messages"
                );
                // Find the email prompt message (by ID or by content)
                let emailPromptIndex = -1;
                if (emailPromptMessageId) {
                  emailPromptIndex = messages.findIndex(
                    (msg) => msg.id === emailPromptMessageId
                  );
                  console.log(
                    "[UniversalChatInterface] 🔍 Found email prompt by ID:",
                    {
                      emailPromptMessageId,
                      emailPromptIndex,
                      found: emailPromptIndex >= 0,
                    }
                  );
                }
                // Fallback: find by content
                if (emailPromptIndex === -1) {
                  emailPromptIndex = messages.findIndex(
                    (msg) =>
                      msg.role === "assistant" &&
                      msg.content.includes("business email address")
                  );
                  console.log(
                    "[UniversalChatInterface] 🔍 Found email prompt by content:",
                    {
                      emailPromptIndex,
                      found: emailPromptIndex >= 0,
                    }
                  );
                }

                if (emailPromptIndex >= 0) {
                  console.log(
                    "[UniversalChatInterface] 📧 Starting to hide messages:",
                    {
                      emailPromptIndex,
                      hideEmailPromptMessages,
                      messageAtPromptIndex: messages[
                        emailPromptIndex
                      ]?.content?.substring(0, 50),
                    }
                  );
                  // Hide messages starting from the email prompt and going backwards
                  let hiddenCount = 0;
                  for (
                    let i = emailPromptIndex;
                    i >= 0 && hiddenCount < hideEmailPromptMessages;
                    i--
                  ) {
                    const msg = messages[i];
                    console.log(
                      `[UniversalChatInterface] 🔍 Checking message at index ${i}:`,
                      {
                        messageId: msg.id,
                        role: msg.role,
                        content: msg.content.substring(0, 50),
                        willHide: msg.role === "assistant",
                        hiddenCount,
                        targetCount: hideEmailPromptMessages,
                      }
                    );
                    // Only hide assistant messages (not user messages)
                    if (msg.role === "assistant") {
                      messagesToHide.add(msg.id);
                      hiddenCount++;
                      console.log(
                        `[UniversalChatInterface] ✅ Added message to hide:`,
                        {
                          messageId: msg.id,
                          hiddenCount,
                        }
                      );
                    }
                  }

                  console.log(
                    "[UniversalChatInterface] 📧 Hiding messages after email submission:",
                    {
                      emailPromptIndex,
                      hideEmailPromptMessages,
                      hiddenCount,
                      messagesToHide: Array.from(messagesToHide),
                      totalMessages: messages.length,
                      messageIdsToHide: Array.from(messagesToHide),
                    }
                  );
                } else {
                  console.log(
                    "[UniversalChatInterface] ⚠️ Could not find email prompt message to hide"
                  );
                }
              } else {
                console.log(
                  "[UniversalChatInterface] ⚠️ hasEmail is FALSE - will NOT hide messages",
                  {
                    hasEmail,
                    awaitingEmail,
                  }
                );
              }

              // Filter out messages to hide
              const filteredMessages = messages.filter(
                (msg) => !messagesToHide.has(msg.id)
              );
              console.log(
                "[UniversalChatInterface] 📊 MESSAGE FILTERING RESULT:",
                {
                  originalCount: messages.length,
                  filteredCount: filteredMessages.length,
                  hiddenCount: messagesToHide.size,
                  messagesToHide: Array.from(messagesToHide),
                }
              );

              return filteredMessages.map((message, index) => {
                // Check for handoff message in traditional chat
                const isHandoffMessage =
                  config.type === "traditional" &&
                  message.role === "assistant" &&
                  index > 0 &&
                  chatInfo?.escalationRequested &&
                  chatInfo?.assignedAt &&
                  new Date(message.timestamp) >=
                    new Date(chatInfo.assignedAt) &&
                  !filteredMessages
                    .slice(0, index)
                    .some((m) => m.role === "assistant");

                // Determine if this message is from the current user
                // Use userId comparison if available, otherwise fall back to role-based logic
                const isOwnMessage =
                  config.currentUserId && message.userId
                    ? message.userId === config.currentUserId
                    : config.features.supportView
                    ? // In support view, only post-assignment assistant messages are "own"
                      message.role === "assistant" &&
                      chatInfo?.assignedAt &&
                      new Date(message.timestamp) >=
                        new Date(chatInfo.assignedAt)
                    : message.role === "user"; // In customer view, user messages are "own"

                // Determine if this message can be edited (support rep messages in support view)
                // Only assistant messages sent after chat assignment can be edited
                const isEditable =
                  config.features.supportView &&
                  config.type === "traditional" &&
                  message.role === "assistant" &&
                  chatInfo?.assignedAt &&
                  new Date(message.timestamp) >= new Date(chatInfo.assignedAt);

                const isEditing = editingMessageId === message.id;

                // Filter system messages based on visibility rules
                // System messages with agentOnly: true are only visible in support view
                if (
                  message.role === "system" &&
                  message.metadata?.agentOnly === true &&
                  !config.features.supportView
                ) {
                  return null; // Don't render agent-only system messages in customer view
                }

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
                                    chatInfo?.assignedTo?.name ||
                                    "Support Agent"
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
                          className={`rounded-lg px-3 py-2 relative group ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : message.role === "system"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              : message.role === "agent"
                              ? "bg-blue-600 text-white"
                              : "bg-muted"
                          }`}
                        >
                          {/* Edit icon for support rep messages */}
                          {isEditable && !isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`absolute top-[6px] right-[-15px] h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                isOwnMessage
                                  ? "hover:bg-primary-foreground/20 text-primary-foreground"
                                  : "hover:bg-background/20"
                              }`}
                              onClick={() => handleStartEdit(message)}
                              title="Edit message"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingContent}
                                onChange={(e) =>
                                  setEditingContent(e.target.value)
                                }
                                className="w-full text-sm bg-background text-foreground border border-border rounded-md px-2 py-1 min-h-[60px] resize-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    handleCancelEdit();
                                  } else if (
                                    e.key === "Enter" &&
                                    (e.metaKey || e.ctrlKey)
                                  ) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  }
                                }}
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  disabled={isSavingEdit}
                                  className="h-7 text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={
                                    isSavingEdit || !editingContent.trim()
                                  }
                                  className="h-7 text-xs"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  {isSavingEdit ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}

                          {/* Email Form - show after email prompt message */}
                          {(() => {
                            // Check if this message is the email prompt message
                            // Match by ID if available, or by content if ID doesn't match
                            const isEmailPromptMessage =
                              emailPromptMessageId === message.id ||
                              (message.role === "assistant" &&
                                message.content.includes(
                                  "business email address"
                                ));

                            // Don't show form if email already submitted OR if awaitingEmail is false
                            const shouldShowEmailForm =
                              !hasEmail && // Don't show form if email already submitted
                              awaitingEmail &&
                              isEmailPromptMessage &&
                              currentChatId;

                            console.log(
                              "[UniversalChatInterface] 📧 EMAIL FORM RENDER CHECK:",
                              {
                                messageId: message.id,
                                messageRole: message.role,
                                messageContent: message.content.substring(
                                  0,
                                  50
                                ),
                                awaitingEmail,
                                hasEmail,
                                emailPromptMessageId,
                                currentChatId,
                                messageIdMatches:
                                  emailPromptMessageId === message.id,
                                isEmailPromptByContent:
                                  message.role === "assistant" &&
                                  message.content.includes(
                                    "business email address"
                                  ),
                                isEmailPromptMessage,
                                hasCurrentChatId: !!currentChatId,
                                conditionChecks: {
                                  notHasEmail: !hasEmail,
                                  awaitingEmail: awaitingEmail,
                                  isEmailPromptMessage: isEmailPromptMessage,
                                  hasCurrentChatId: !!currentChatId,
                                },
                                shouldShowEmailForm,
                                willShowForm: shouldShowEmailForm,
                              }
                            );

                            return shouldShowEmailForm ? (
                              <div className="mt-3">
                                <EmailForm
                                  chatId={currentChatId}
                                  onEmailSubmitted={handleEmailSubmitted}
                                  onError={(error) => {
                                    console.error(
                                      "[UniversalChatInterface] Email submission error:",
                                      error
                                    );
                                  }}
                                />
                              </div>
                            ) : null;
                          })()}

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
                          {config.type === "traditional" &&
                            message.metadata && (
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
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
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
              });
            })()}

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

            {/* Typing indicator - show whenever waiting for AI assistant response */}
            {/* Show when loading, but hide if we already have streaming content to display */}
            {isLoading &&
              (!isStreaming || !streamingContent) &&
              !escalationActivated &&
              !isLoadingHistory && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Escalation Button - Always enabled as built-in feature */}
          {(() => {
            // Show escalation button if:
            // 1. Escalation is requested
            // 2. Escalation hasn't been activated yet
            // Escalation is always enabled - no config check needed
            const shouldShowEscalation =
              escalationRequested && !escalationActivated;

            console.log(
              "[UniversalChatInterface] 🎨 ESCALATION UI RENDER CHECK (EVERY RENDER):",
              {
                shouldShow: shouldShowEscalation,
                escalationRequested,
                escalationActivated,
                escalationReason,
                chatId: config.chatId,
                type: config.type,
                willRenderButton: shouldShowEscalation,
              }
            );

            return shouldShowEscalation;
          })() && (
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
                  awaitingEmail
                    ? "Please provide your email address above..."
                    : escalationActivated
                    ? "Message customer support..."
                    : config.placeholder || "Type your message..."
                }
                className="flex-1 text-sm min-h-[40px] max-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none overflow-y-auto"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                name="chat-message"
                rows={1}
                disabled={awaitingEmail || isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputMessage.trim() && !isLoading && !awaitingEmail) {
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
                disabled={isLoading || !inputMessage.trim() || awaitingEmail}
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
