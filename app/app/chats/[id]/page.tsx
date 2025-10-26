"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { ArrowLeft, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { TraditionalChatInterface } from "@/components/chat/TraditionalChatInterface";
import { VectorSearchResult } from "@/lib/vector-db";

interface TraditionalChat {
  id: string;
  title: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
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
}

export default function ChatDetailPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  const [chat, setChat] = useState<TraditionalChat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        const response = await fetch(`/api/chats/${chatId}`);
        if (response.ok) {
          const data = await response.json();
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
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <div className="space-y-6">
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
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(chat.status)}
            <h1 className="text-2xl font-bold tracking-tight">{chat.title}</h1>
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(chat.status)}`}
            >
              {chat.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Created: {formatDate(chat.createdAt)}</span>
            <span>Last updated: {formatDate(chat.updatedAt)}</span>
            <span>{chat._count.messages} messages</span>
          </div>
        </div>
      </div>

      {chat.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{chat.description}</p>
          </CardContent>
        </Card>
      )}

      <TraditionalChatInterface chatId={chat.id} className="h-[700px]" />
    </div>
  );
}
