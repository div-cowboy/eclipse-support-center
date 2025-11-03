"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { X, Loader2 } from "lucide-react";
import { CreateTicketForm } from "./CreateTicketForm";
import { TicketPriority } from "@prisma/client";

interface CreateTicketFromChatModalProps {
  chatId: string;
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticket: any) => void;
}

interface ChatData {
  id: string;
  title: string;
  description?: string;
  escalationRequested?: boolean;
  escalationReason?: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

export function CreateTicketFromChatModal({
  chatId,
  organizationId,
  isOpen,
  onClose,
  onSuccess,
}: CreateTicketFromChatModalProps) {
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [includeTranscript, setIncludeTranscript] = useState(true);

  useEffect(() => {
    if (isOpen && chatId) {
      loadChatData();
    }
  }, [isOpen, chatId]);

  const loadChatData = async () => {
    setIsLoadingChat(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setChatData(data);
      }
    } catch (error) {
      console.error("Error loading chat data:", error);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const formatChatTranscript = (messages: ChatData["messages"]) => {
    return messages
      .map((msg) => {
        const timestamp = new Date(msg.createdAt).toLocaleString();
        const role =
          msg.role === "USER"
            ? "Customer"
            : msg.role === "AGENT"
            ? "Agent"
            : msg.role === "ASSISTANT"
            ? "Bot"
            : "System";
        return `[${timestamp}] ${role}: ${msg.content}`;
      })
      .join("\n\n");
  };

  const handleCreateTicket = async (formData: any) => {
    // Use the dedicated chat-to-ticket API endpoint
    try {
      const response = await fetch(`/api/tickets/from-chat/${chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: formData.subject,
          priority: formData.priority,
          category: formData.category,
          includeTranscript,
          autoAssignToAgent: formData.assignToMe,
          tags: [...(formData.tags || []), "escalated-from-chat"],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }

      if (data.success && onSuccess) {
        onSuccess(data.ticket);
      }
    } catch (error) {
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Ticket from Chat</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingChat ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chatData ? (
            <div className="space-y-6">
              {/* Chat Preview */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Chat Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Title:</span>
                    <p className="text-sm text-muted-foreground">
                      {chatData.title}
                    </p>
                  </div>
                  {chatData.escalationRequested && (
                    <div>
                      <span className="text-sm font-medium">
                        Escalation Reason:
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {chatData.escalationReason || "User requested human assistance"}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium">Messages:</span>
                    <p className="text-sm text-muted-foreground">
                      {chatData.messages.length} messages
                    </p>
                  </div>

                  {/* Include Transcript Toggle */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="includeTranscript"
                      checked={includeTranscript}
                      onChange={(e) => setIncludeTranscript(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor="includeTranscript"
                      className="text-sm cursor-pointer"
                    >
                      Include full chat transcript in ticket description
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Form */}
              <CreateTicketForm
                organizationId={organizationId}
                mode="modal"
                defaultValues={{
                  subject: chatData.title || "Issue from chat",
                  description: includeTranscript
                    ? `--- Chat Transcript ---\n\n${formatChatTranscript(
                        chatData.messages
                      )}\n\n--- End of Transcript ---`
                    : chatData.description || chatData.title,
                  priority: chatData.escalationRequested
                    ? TicketPriority.HIGH
                    : TicketPriority.MEDIUM,
                  tags: chatData.escalationRequested
                    ? ["escalated-from-chat"]
                    : [],
                  originChatId: chatId,
                }}
                onSuccess={onSuccess}
                onCancel={onClose}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Failed to load chat data. Please try again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

