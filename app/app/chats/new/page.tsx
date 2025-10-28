"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Textarea } from "@/components/shadcn/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { UniversalChatInterface } from "@/components/chat/UniversalChatInterface";
import type { ChatConfig } from "@/components/chat/UniversalChatInterface";

export default function NewChatPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdChatId, setCreatedChatId] = useState<string | null>(null);

  const handleCreateChat = async () => {
    if (!message.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.chat) {
          setCreatedChatId(data.chat.id);
        }
      } else {
        console.error("Failed to create chat");
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateChat();
  };

  if (createdChatId) {
    const chatConfig: ChatConfig = {
      apiEndpoint: "/api/chats",
      type: "traditional",
      chatId: createdChatId,
      title: "Support Chat",
      placeholder: "Type your message...",
      className: "h-[700px]",
      features: {
        streaming: false,
        escalation: false,
        debugMode: false,
        contextBlocks: false,
        multiChat: false,
        supportView: false, // Customer view
        realtimeMode: false, // Will be enabled after escalation
        showBranding: false,
        showSources: false,
        showTokens: false,
        showStatus: true,
        showPriority: true,
        showAssignedTo: true,
      },
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/app/chats")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chats
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            New Support Chat
          </h1>
        </div>

        <UniversalChatInterface config={chatConfig} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/app/chats")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chats
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Start New Support Chat
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Send Your Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question..."
                className="min-h-[200px]"
                disabled={isCreating}
              />
              <Button
                type="submit"
                disabled={!message.trim() || isCreating}
                className="w-full"
              >
                {isCreating ? (
                  "Creating Chat..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Start Chat
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Support Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Send Your Message</h4>
                  <p className="text-sm text-muted-foreground">
                    Describe your issue or question in detail.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Get Response</h4>
                  <p className="text-sm text-muted-foreground">
                    Our support team will respond as soon as possible.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Continue Conversation</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep the conversation going until your issue is resolved.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
