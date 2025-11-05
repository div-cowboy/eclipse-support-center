"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/shadcn/ui/button";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  Building2,
  MessageSquare,
  PhoneCall,
  UserCheck,
  UserX,
  Ticket,
} from "lucide-react";
import { UniversalChatInterface } from "@/components/chat/UniversalChatInterface";
import { VectorSearchResult } from "@/lib/vector-db";
import { CreateTicketFromChatModal } from "@/components/tickets/CreateTicketFromChatModal";

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
  messages: Array<{
    id: string;
    content: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    timestamp: Date;
    metadata?: VectorSearchResult["metadata"];
  }>;
  _count: {
    messages: number;
  };
  chatbot?: {
    id: string;
    name: string;
    description?: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  };
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function ChatDetailPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  const { data: session } = useSession();
  const [chat, setChat] = useState<TraditionalChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningChat, setAssigningChat] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        console.log("[ChatDetailPage] Fetching chat:", chatId);
        const response = await fetch(`/api/chats/${chatId}`);
        if (response.ok) {
          const data = await response.json();
          console.log("[ChatDetailPage] Chat data loaded:", {
            chatId: data.id,
            escalationRequested: data.escalationRequested,
            assignedToId: data.assignedToId,
            messageCount: data._count?.messages,
          });
          setChat(data);
        } else {
          console.error("Failed to fetch chat");
        }
      } catch (error) {
        console.error("Error fetching chat:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId]);

  const handlePickUpChat = async () => {
    console.log("[ChatDetailPage] Picking up chat:", chatId);
    setAssigningChat(true);
    try {
      const response = await fetch(`/api/chats/${chatId}/assign`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[ChatDetailPage] Chat assigned successfully:", {
          chatId: data.chat.id,
          assignedToId: data.chat.assignedToId,
          assignedAt: data.chat.assignedAt,
          assignedToName:
            data.chat.assignedTo?.name || data.chat.assignedTo?.email,
        });
        setChat(data.chat);

        // Agent joined broadcast is handled server-side by the API
        // The /api/chats/[id]/assign endpoint publishes to Redis pub/sub
        // which the WebSocket server subscribes to and broadcasts to all connected clients
        console.log(
          "✅ [Client] Agent assignment complete - server will broadcast agent_joined event"
        );
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign chat");
      }
    } catch (error) {
      console.error("Error assigning chat:", error);
      alert("Failed to assign chat");
    } finally {
      setAssigningChat(false);
    }
  };

  const handleReleaseChat = async () => {
    setAssigningChat(true);
    try {
      const response = await fetch(`/api/chats/${chatId}/assign`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setChat(data.chat);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to release chat");
      }
    } catch (error) {
      console.error("Error releasing chat:", error);
      alert("Failed to release chat");
    } finally {
      setAssigningChat(false);
    }
  };

  // Memoize chat config to prevent infinite re-renders

  const chatConfig = useMemo(() => {
    if (!chat) return null;

    console.log("[ChatDetailPage] Creating chat config:", {
      chatId: chat.id,
      escalationRequested: chat.escalationRequested,
      assignedToId: chat.assignedToId,
      realtimeMode: chat.escalationRequested,
    });

    return {
      apiEndpoint: "/api/chats",
      type: "traditional" as const,
      chatId: chat.id,
      currentUserId: session?.user?.id, // Pass current user ID for message alignment
      title: chat.escalationRequested ? "Live Support Chat" : "Support Chat",
      placeholder: chat.escalationRequested
        ? "Type your response to customer..."
        : "Type your response as support agent...",
      className: "h-full",
      features: {
        streaming: false,
        // escalation is always enabled - built-in feature
        debugMode: false,
        contextBlocks: false,
        multiChat: false,
        supportView: true, // This is the agent view
        realtimeMode: chat.escalationRequested, // Enable real-time for escalated chats
        showBranding: false,
        showSources: false,
        showTokens: false,
        showStatus: true,
        showPriority: true,
        showAssignedTo: true,
      },
    };
  }, [chat, session?.user?.id]); // Recreate when chat or user changes

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "ARCHIVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "DELETED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "ARCHIVED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "DELETED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (date: Date) => {
    // Use ISO format to avoid hydration mismatches between server and client
    const d = new Date(date);
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-semibold mb-2">Chat not found</h3>
        <p className="text-muted-foreground text-center mb-6">
          The chat you&apos;re looking for doesn&apos;t exist or has been
          deleted.
        </p>
        <Button onClick={() => router.push("/app/chats")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chats
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/app/chats")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(chat.status)}
            <h1 className="text-2xl font-bold tracking-tight">{chat.title}</h1>
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(chat.status)}`}
            >
              {chat.status}
            </Badge>
            {chat.chatbot ? (
              <Badge
                variant="outline"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
              >
                <Bot className="h-3 w-3 mr-1" />
                Embedded Chat
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Direct Support
              </Badge>
            )}
            {chat.escalationRequested && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
              >
                <PhoneCall className="h-3 w-3 mr-1" />
                Support Requested
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span suppressHydrationWarning>
              Created: {formatDate(chat.createdAt)}
            </span>
            <span suppressHydrationWarning>
              Last updated: {formatDate(chat.updatedAt)}
            </span>
            <span>{chat._count?.messages || 0} messages</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Left Column - Chat Interface */}
        <div className="min-h-[calc(100vh-200px)]">
          {chatConfig && (
            <UniversalChatInterface key={chat.id} config={chatConfig} />
          )}
        </div>

        {/* Right Column - Information Cards */}
        <div className="space-y-4">
          {/* Chat Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Chat Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chat.escalationRequested && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2 mb-2">
                    <PhoneCall className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Support Requested
                      </p>
                      {chat.escalationReason && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          {chat.escalationReason}
                        </p>
                      )}
                      {chat.escalationRequestedAt && (
                        <p
                          className="text-xs text-amber-600 dark:text-amber-400 mt-1"
                          suppressHydrationWarning
                        >
                          {formatDate(new Date(chat.escalationRequestedAt))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {chat.assignedTo ? (
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Assigned To
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {chat.assignedTo.name || chat.assignedTo.email}
                        </p>
                        {chat.assignedAt && (
                          <p
                            className="text-xs text-green-600 dark:text-green-400 mt-1"
                            suppressHydrationWarning
                          >
                            {formatDate(new Date(chat.assignedAt))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleReleaseChat}
                    disabled={assigningChat}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    {assigningChat ? "Releasing..." : "Release Chat"}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handlePickUpChat}
                  disabled={assigningChat}
                  size="sm"
                  className="w-full"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {assigningChat ? "Picking Up..." : "Pick Up Chat"}
                </Button>
              )}

              {/* Create Ticket Button */}
              {chat.chatbot?.organization?.id && (
                <Button
                  onClick={() => setShowTicketModal(true)}
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Chat Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Status
                </p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(chat.status)}
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(chat.status)}`}
                  >
                    {chat.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </p>
                <p className="text-sm" suppressHydrationWarning>
                  {formatDate(chat.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Last Updated
                </p>
                <p className="text-sm" suppressHydrationWarning>
                  {formatDate(chat.updatedAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Messages
                </p>
                <p className="text-sm">{chat._count?.messages || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Chatbot Information Card */}
          {chat.chatbot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Chatbot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Name
                  </p>
                  <p className="text-sm font-semibold">{chat.chatbot.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Organization
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    {chat.chatbot.organization.name}
                  </Badge>
                </div>
                {chat.chatbot.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {chat.chatbot.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Chat Description */}
          {chat.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {chat.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {chat?.chatbot?.organization?.id && (
        <CreateTicketFromChatModal
          chatId={chat.id}
          organizationId={chat.chatbot.organization.id}
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          onSuccess={(ticket) => {
            setShowTicketModal(false);
            // Navigate to the created ticket
            router.push(`/app/tickets/${ticket.id}`);
          }}
        />
      )}
    </div>
  );
}
