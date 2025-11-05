"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Label } from "@/components/shadcn/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  Clock,
  MessageSquare,
  Activity,
  Eye,
  EyeOff,
} from "lucide-react";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { TicketResponseForm } from "@/components/tickets/TicketResponseForm";
import { format } from "date-fns";
import Link from "next/link";

interface TicketDetail {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: string;
  tags: string[];
  requesterName: string;
  requesterEmail: string;
  organizationId: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  originChatId?: string | null;
  originChat?: {
    id: string;
    title: string;
    messages: Array<{
      role: string;
      content: string;
      createdAt: string;
    }>;
  } | null;
  responses: Array<{
    id: string;
    content: string;
    isInternal: boolean;
    authorName: string;
    authorEmail: string;
    createdAt: string;
  }>;
  activities: Array<{
    id: string;
    activityType: string;
    description: string;
    performedByName: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export default function TicketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && ticketId) {
      loadTicket();
    }
  }, [session, ticketId]);

  useEffect(() => {
    if (ticket?.organizationId) {
      loadUsers(ticket.organizationId);
    }
  }, [ticket?.organizationId]);

  const loadTicket = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the ticket data to match our interface
        const ticketData: TicketDetail = {
          ...data.ticket,
          organizationId: data.ticket.organization?.id || data.ticket.organizationId,
          requesterName: data.ticket.requester?.name || data.ticket.requesterName,
          requesterEmail: data.ticket.requester?.email || data.ticket.requesterEmail,
          assignedTo: data.ticket.assignedTo
            ? {
                id: data.ticket.assignedTo.id,
                name: data.ticket.assignedTo.name || "",
                email: data.ticket.assignedTo.email,
              }
            : null,
        };
        setTicket(ticketData);
      } else {
        console.error("Failed to load ticket");
        router.push("/app/tickets");
      }
    } catch (error) {
      console.error("Error loading ticket:", error);
      router.push("/app/tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async (organizationId: string) => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(
        `/api/users?organizationId=${organizationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!session?.user?.id) return;
    await updateTicket({ assignedToId: session.user.id });
  };

  const updateTicket = async (updates: { assignedToId?: string | null; status?: TicketStatus; priority?: TicketPriority }) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadTicket();
      } else {
        const error = await response.json();
        console.error("Error updating ticket:", error);
        alert(error.error || "Failed to update ticket");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      alert("Failed to update ticket");
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.CRITICAL:
        return "bg-red-600 text-white";
      case TicketPriority.URGENT:
        return "bg-orange-500 text-white";
      case TicketPriority.HIGH:
        return "bg-yellow-500 text-white";
      case TicketPriority.MEDIUM:
        return "bg-blue-500 text-white";
      case TicketPriority.LOW:
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.NEW:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case TicketStatus.OPEN:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case TicketStatus.IN_PROGRESS:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case TicketStatus.WAITING_ON_CUSTOMER:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case TicketStatus.RESOLVED:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case TicketStatus.CLOSED:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: TicketStatus) => {
    return status.replace(/_/g, " ");
  };

  if (status === "loading" || !session || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/app/tickets")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">
                Ticket #{ticket.ticketNumber}
              </h1>
              <Badge className={getStatusColor(ticket.status)}>
                {formatStatus(ticket.status)}
              </Badge>
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
              {ticket.originChatId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  From Chat
                </Badge>
              )}
            </div>
            <h2 className="text-xl text-muted-foreground">{ticket.subject}</h2>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActivities(!showActivities)}
            >
              <Activity className="h-4 w-4 mr-2" />
              {showActivities ? "Hide" : "Show"} Activity
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">
                {ticket.description}
              </div>
              {ticket.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  {ticket.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Chat */}
          {ticket.originChat && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Related Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{ticket.originChat.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Chat ID: {ticket.originChat.id}
                    </p>
                  </div>
                  <Link href={`/app/chats/${ticket.originChat.id}`}>
                    <Button variant="outline" size="sm">
                      View Chat
                    </Button>
                  </Link>
                </div>

                {/* Chat Transcript Preview */}
                {ticket.originChat.messages.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/50 space-y-3 max-h-64 overflow-y-auto">
                    <p className="text-sm font-medium text-muted-foreground">
                      Chat Transcript Preview (first 5 messages):
                    </p>
                    {ticket.originChat.messages.slice(0, 5).map((msg, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">
                          {msg.role === "USER" ? "Customer" : "Bot"}:
                        </span>{" "}
                        {msg.content}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Responses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Responses ({ticket.responses.length})</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInternalNotes(!showInternalNotes)}
                >
                  {showInternalNotes ? (
                    <Eye className="h-4 w-4 mr-2" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-2" />
                  )}
                  {showInternalNotes ? "Hide" : "Show"} Internal Notes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Response Timeline */}
                {ticket.responses
                  .filter((r) => showInternalNotes || !r.isInternal)
                  .map((response) => (
                    <div
                      key={response.id}
                      className={`border-l-2 pl-4 py-2 ${
                        response.isInternal
                          ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10"
                          : "border-blue-500"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {response.authorName}
                            {response.isInternal && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-yellow-100"
                              >
                                Internal
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {response.authorEmail}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(response.createdAt),
                            "MMM d, yyyy HH:mm"
                          )}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {response.content}
                      </div>
                    </div>
                  ))}

                {ticket.responses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No responses yet. Be the first to respond!
                  </p>
                )}

                {/* Add Response Form */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">Add Response</h3>
                  <TicketResponseForm
                    ticketId={ticket.id}
                    onSuccess={loadTicket}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          {showActivities && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ticket.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      <div className="flex-1">
                        <p>{activity.description}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {activity.performedByName} •{" "}
                          {format(
                            new Date(activity.createdAt),
                            "MMM d, yyyy HH:mm"
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={ticket.status}
                  onValueChange={(value) =>
                    updateTicket({ status: value as TicketStatus })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketStatus.NEW}>New</SelectItem>
                    <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={TicketStatus.IN_PROGRESS}>
                      In Progress
                    </SelectItem>
                    <SelectItem value={TicketStatus.WAITING_ON_CUSTOMER}>
                      Waiting on Customer
                    </SelectItem>
                    <SelectItem value={TicketStatus.RESOLVED}>
                      Resolved
                    </SelectItem>
                    <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Priority
                </Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(value) =>
                    updateTicket({ priority: value as TicketPriority })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                    <SelectItem value={TicketPriority.MEDIUM}>
                      Medium
                    </SelectItem>
                    <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                    <SelectItem value={TicketPriority.URGENT}>
                      Urgent
                    </SelectItem>
                    <SelectItem value={TicketPriority.CRITICAL}>
                      Critical
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              {ticket.category && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Category
                  </Label>
                  <p className="text-sm font-medium mt-1.5">
                    {ticket.category}
                  </p>
                </div>
              )}

              {/* Assigned To */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Assigned To
                </Label>
                <div className="mt-1.5 space-y-2">
                  <Select
                    value={ticket.assignedTo?.id || "unassigned"}
                    onValueChange={(value) => {
                      if (value === "unassigned") {
                        updateTicket({ assignedToId: null });
                      } else {
                        updateTicket({ assignedToId: value });
                      }
                    }}
                    disabled={isUpdating || isLoadingUsers}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue>
                        {ticket.assignedTo
                          ? `${ticket.assignedTo.name || ticket.assignedTo.email}`
                          : "Unassigned"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {session?.user?.id &&
                    ticket.assignedTo?.id !== session.user.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAssignToMe}
                        disabled={isUpdating}
                        className="w-full"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Assign to Me
                      </Button>
                    )}
                  {ticket.assignedTo && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">
                          {ticket.assignedTo.name || ticket.assignedTo.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ticket.assignedTo.email}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requester */}
          <Card>
            <CardHeader>
              <CardTitle>Requester</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {ticket.requesterName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ticket.requesterEmail}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="font-medium">
                    {format(new Date(ticket.createdAt), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">
                    Last Updated
                  </div>
                  <div className="font-medium">
                    {format(new Date(ticket.updatedAt), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
