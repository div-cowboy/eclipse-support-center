"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Bot, Plus, Edit, Trash2, MessageSquare } from "lucide-react";

// Chatbot type based on Prisma schema
interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  config?: any;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    chats: number;
    contextBlocks: number;
  };
}

// Mock data for chatbots - replace with actual data fetching
const mockChatbots: Chatbot[] = [
  {
    id: "1",
    name: "Eclipse IDE Support Bot",
    description:
      "Helps with Eclipse IDE setup, configuration, and troubleshooting",
    status: "ACTIVE",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    _count: {
      chats: 12,
      contextBlocks: 25,
    },
  },
  {
    id: "2",
    name: "Java Development Assistant",
    description: "Assists with Java compilation, debugging, and best practices",
    status: "ACTIVE",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
    _count: {
      chats: 8,
      contextBlocks: 18,
    },
  },
  {
    id: "3",
    name: "Plugin Installation Helper",
    description:
      "Guides users through Eclipse plugin installation and management",
    status: "ARCHIVED",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-12"),
    _count: {
      chats: 5,
      contextBlocks: 12,
    },
  },
];

function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Bot className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No chatbots yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Create your first chatbot to provide intelligent support for Eclipse
        development issues. Add context blocks to build a knowledge base.
      </p>
      <Button onClick={() => router.push("/app/chatbots/new")}>
        <Plus className="h-4 w-4 mr-2" />
        Create Chatbot
      </Button>
    </div>
  );
}

function ChatbotsTable({ chatbots }: { chatbots: Chatbot[] }) {
  const router = useRouter();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Chatbots</CardTitle>
        <CardDescription>
          Manage your AI chatbots and their knowledge bases for Eclipse support.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chats</TableHead>
                <TableHead>Context Blocks</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chatbots.map((chatbot) => (
                <TableRow key={chatbot.id}>
                  <TableCell className="font-medium">
                    <button
                      onClick={() => router.push(`/app/chatbots/${chatbot.id}`)}
                      className="flex items-center hover:text-primary transition-colors"
                    >
                      <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                      {chatbot.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {chatbot.description || "No description"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        chatbot.status
                      )}`}
                    >
                      {chatbot.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1 text-muted-foreground" />
                      {chatbot._count.chats}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Bot className="h-4 w-4 mr-1 text-muted-foreground" />
                      {chatbot._count.contextBlocks}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(chatbot.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/app/chatbots/${chatbot.id}`)
                        }
                      >
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChatbotsPage() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading - replace with actual API call
    const timer = setTimeout(() => {
      setChatbots(mockChatbots);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chatbots</h1>
          <p className="text-muted-foreground">
            Manage your AI chatbots and their knowledge bases for Eclipse
            support.
          </p>
        </div>
        <Button onClick={() => router.push("/app/chatbots/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Chatbot
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading chatbots...</div>
        </div>
      ) : chatbots.length === 0 ? (
        <EmptyState />
      ) : (
        <ChatbotsTable chatbots={chatbots} />
      )}
    </div>
  );
}
