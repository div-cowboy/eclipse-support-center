"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import {
  MessageSquare,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Bot,
  Building2,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";

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
  _count: {
    messages: number;
  };
  chatbot?: {
    id: string;
    name: string;
    organization: {
      id: string;
      name: string;
    };
  };
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function ChatsPage() {
  const router = useRouter();
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
    // Use ISO format to avoid hydration mismatches between server and client
    const d = new Date(date);
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  };

  const handleViewChat = (chatId: string) => {
    // For now, we'll open in a new tab. Later we can implement a modal or side panel
    window.open(`/app/chats/${chatId}`, "_blank");
  };

  const handleCreateNewChat = () => {
    // Navigate to a new chat creation page or open a modal
    router.push("/app/chats/new");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Chats</h1>
          <p className="text-muted-foreground">
            Manage all customer conversations including embedded chatbot
            interactions and direct support inquiries.
          </p>
        </div>
        <Button onClick={handleCreateNewChat}>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <Card>
        {/* <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            All Chats
          </CardTitle>
          <CardDescription>
            A comprehensive view of all customer support conversations.
          </CardDescription>
        </CardHeader> */}
        <CardContent className="pt-6">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-6 mb-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No support chats yet
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                Start a new conversation to get help from our support team.
              </p>
              <Button onClick={handleCreateNewChat}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chats.map((chat) => (
                  <TableRow
                    key={chat.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewChat(chat.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(chat.status)}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(chat.status)}`}
                        >
                          {chat.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{chat.title}</div>
                        {/* {chat.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {chat.description}
                          </div>
                        )} */}
                        {chat.chatbot && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {chat.chatbot.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {chat.chatbot?.organization ? (
                        <Badge variant="secondary" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {chat.chatbot.organization.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {chat.escalationRequested ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                        >
                          <PhoneCall className="h-3 w-3 mr-1" />
                          Support Requested
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {chat.assignedTo ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          {chat.assignedTo.name || chat.assignedTo.email}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {chat._count?.messages || 0} messages
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-sm text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatDate(chat.createdAt)}
                    </TableCell>
                    <TableCell
                      className="text-sm text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatDate(chat.updatedAt)}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewChat(chat.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Chat
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Archive</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
