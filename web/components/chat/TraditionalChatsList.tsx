"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
} from "lucide-react";

interface TraditionalChat {
  id: string;
  title: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdAt: Date;
  updatedAt: Date;
  _count: {
    messages: number;
  };
}

interface TraditionalChatsListProps {
  onSelectChat: (chatId: string) => void;
  onCreateNewChat: () => void;
}

export function TraditionalChatsList({
  onSelectChat,
  onCreateNewChat,
}: TraditionalChatsListProps) {
  const [chats, setChats] = useState<TraditionalChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch("/api/chats");
        if (response.ok) {
          const data = await response.json();
          setChats(data);
        } else {
          console.error("Failed to fetch chats");
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-6 mb-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No support chats yet</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          Start a new conversation to get help from our support team.
        </p>
        <Button onClick={onCreateNewChat}>
          <Plus className="h-4 w-4 mr-2" />
          Start New Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Support Chats</h2>
        <Button onClick={onCreateNewChat} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="grid gap-4">
        {chats.map((chat) => (
          <Card
            key={chat.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectChat(chat.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  {getStatusIcon(chat.status)}
                  <span className="truncate">{chat.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(chat.status)}`}
                  >
                    {chat.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              {chat.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {chat.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{chat._count?.messages || 0} messages</span>
                <span>{formatDate(chat.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
