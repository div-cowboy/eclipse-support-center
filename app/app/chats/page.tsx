"use client";

import { useState, useEffect } from "react";
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
import { MessageSquare, Plus } from "lucide-react";

// Mock data type for chats - replace with actual Prisma types when implemented
interface Chat {
  id: string;
  title: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

// Mock data - replace with actual data fetching
const mockChats: Chat[] = [
  {
    id: "1",
    title: "Eclipse IDE Setup Help",
    description: "Getting help with Eclipse IDE configuration",
    status: "ACTIVE",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    messageCount: 12,
  },
  {
    id: "2",
    title: "Java Development Issues",
    description: "Debugging Java compilation problems",
    status: "ACTIVE",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
    messageCount: 8,
  },
  {
    id: "3",
    title: "Plugin Installation",
    description: "Help with installing Eclipse plugins",
    status: "ARCHIVED",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-12"),
    messageCount: 5,
  },
];

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-6 mb-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No chats yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Start a conversation to get help with Eclipse development issues. Your
        chats will appear here.
      </p>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Start New Chat
      </Button>
    </div>
  );
}

function ChatsTable({ chats }: { chats: Chat[] }) {
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
      case "ARCHIVED":
        return "bg-yellow-100 text-yellow-800";
      case "DELETED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Chats</CardTitle>
        <CardDescription>
          Manage your support conversations and get help with Eclipse
          development.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell className="font-medium">{chat.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {chat.description || "No description"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        chat.status
                      )}`}
                    >
                      {chat.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1 text-muted-foreground" />
                      {chat.messageCount}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(chat.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
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

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      //   setChats(mockChats);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chats</h1>
          <p className="text-muted-foreground">
            Manage your support conversations and get help with Eclipse
            development issues.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading chats...</div>
        </div>
      ) : chats.length === 0 ? (
        <EmptyState />
      ) : (
        <ChatsTable chats={chats} />
      )}
    </div>
  );
}
