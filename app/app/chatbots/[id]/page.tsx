"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Bot,
  MessageSquare,
  FileText,
} from "lucide-react";
import { ContextBlockList } from "@/components/chatbots/ContextBlockList";
import { ContextBlockForm } from "@/components/chatbots/ContextBlockForm";

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  config?: any;
  createdAt: Date;
  updatedAt: Date;
  contextBlocks: ContextBlock[];
  _count: {
    chats: number;
    contextBlocks: number;
  };
}

interface ContextBlock {
  id: string;
  title: string;
  content: string;
  type:
    | "TEXT"
    | "CODE"
    | "DOCUMENTATION"
    | "FAQ"
    | "TROUBLESHOOTING"
    | "TUTORIAL";
  metadata?: any;
  vectorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatbotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContextForm, setShowContextForm] = useState(false);
  const [editingContextBlock, setEditingContextBlock] =
    useState<ContextBlock | null>(null);

  useEffect(() => {
    // Fetch chatbot data
    const fetchChatbot = async () => {
      try {
        const response = await fetch(`/api/chatbots/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setChatbot(data);
        } else {
          console.error("Failed to fetch chatbot");
        }
      } catch (error) {
        console.error("Error fetching chatbot:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchChatbot();
    }
  }, [params.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleContextBlockSubmit = async (data: {
    title: string;
    content: string;
    type:
      | "TEXT"
      | "CODE"
      | "DOCUMENTATION"
      | "FAQ"
      | "TROUBLESHOOTING"
      | "TUTORIAL";
    metadata?: any;
  }) => {
    try {
      const url = editingContextBlock
        ? `/api/chatbots/${params.id}/context-blocks/${editingContextBlock.id}`
        : `/api/chatbots/${params.id}/context-blocks`;

      const method = editingContextBlock ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Refresh chatbot data
        const updatedResponse = await fetch(`/api/chatbots/${params.id}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setChatbot(updatedData);
        }
        setShowContextForm(false);
        setEditingContextBlock(null);
      } else {
        console.error("Failed to save context block");
      }
    } catch (error) {
      console.error("Error saving context block:", error);
    }
  };

  const handleContextBlockDelete = async (contextBlockId: string) => {
    if (!confirm("Are you sure you want to delete this context block?")) return;

    try {
      const response = await fetch(
        `/api/chatbots/${params.id}/context-blocks/${contextBlockId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Refresh chatbot data
        const updatedResponse = await fetch(`/api/chatbots/${params.id}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setChatbot(updatedData);
        }
      } else {
        console.error("Failed to delete context block");
      }
    } catch (error) {
      console.error("Error deleting context block:", error);
    }
  };

  const handleContextBlockEdit = (contextBlock: ContextBlock) => {
    setEditingContextBlock(contextBlock);
    setShowContextForm(true);
  };

  const handleAddContextBlock = () => {
    setEditingContextBlock(null);
    setShowContextForm(false);
    setShowContextForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading chatbot...</div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chatbot not found</div>
      </div>
    );
  }

  if (showContextForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setShowContextForm(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chatbot
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {editingContextBlock ? "Edit Context Block" : "Add Context Block"}
          </h1>
        </div>
        <ContextBlockForm
          contextBlock={editingContextBlock || undefined}
          onSubmit={handleContextBlockSubmit}
          onCancel={() => {
            setShowContextForm(false);
            setEditingContextBlock(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              <Bot className="h-6 w-6 mr-2" />
              {chatbot.name}
            </h1>
            <p className="text-muted-foreground">
              {chatbot.description || "No description provided"}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Chatbot
          </Button>
          <Button variant="outline">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${getStatusColor(chatbot.status)} w-fit`}>
              {chatbot.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-2xl font-bold">{chatbot._count.chats}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Context Blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {chatbot._count.contextBlocks}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Chatbot Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Created</h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(chatbot.createdAt)}
              </p>
            </div>
            <div>
              <h4 className="font-medium">Last Updated</h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(chatbot.updatedAt)}
              </p>
            </div>
            {chatbot.config && (
              <div>
                <h4 className="font-medium">Configuration</h4>
                <pre className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {JSON.stringify(chatbot.config, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vector Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Vectorized Blocks</span>
                <span className="text-sm font-medium">
                  {
                    chatbot.contextBlocks.filter((block) => block.vectorId)
                      .length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending Blocks</span>
                <span className="text-sm font-medium">
                  {
                    chatbot.contextBlocks.filter((block) => !block.vectorId)
                      .length
                  }
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${
                      chatbot.contextBlocks.length > 0
                        ? (chatbot.contextBlocks.filter(
                            (block) => block.vectorId
                          ).length /
                            chatbot.contextBlocks.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ContextBlockList
        contextBlocks={chatbot.contextBlocks}
        onEdit={handleContextBlockEdit}
        onDelete={handleContextBlockDelete}
        onAdd={handleAddContextBlock}
      />
    </div>
  );
}
