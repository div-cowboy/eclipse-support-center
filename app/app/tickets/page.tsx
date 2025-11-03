"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import {
  Plus,
  Search,
  Filter,
  Ticket as TicketIcon,
  MessageSquare,
  Loader2,
  User,
  Calendar,
} from "lucide-react";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { CreateTicketForm } from "@/components/tickets/CreateTicketForm";
import { format } from "date-fns";

interface TicketListItem {
  id: string;
  ticketNumber: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterName: string;
  requesterEmail: string;
  originChatId?: string | null;
  assignedTo?: {
    name: string;
  } | null;
  createdAt: string;
  _count: {
    responses: number;
  };
}

export default function TicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      loadTickets();
    }
  }, [session, searchQuery, statusFilter, priorityFilter, page]);

  const loadTickets = async () => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      // For now, use first organization (in real app, get from user session)
      const orgId = "cm3jykkxy0000xwnxrdfkxfnp"; // TODO: Get from user session

      const params = new URLSearchParams({
        organizationId: orgId,
        page: page.toString(),
        limit: "20",
      });

      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);

      const response = await fetch(`/api/tickets?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setIsLoading(false);
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

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TicketIcon className="h-8 w-8" />
              Support Tickets
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track support tickets
            </p>
          </div>
          <Button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
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
              <div>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value={TicketPriority.CRITICAL}>
                      Critical
                    </SelectItem>
                    <SelectItem value={TicketPriority.URGENT}>
                      Urgent
                    </SelectItem>
                    <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                    <SelectItem value={TicketPriority.MEDIUM}>
                      Medium
                    </SelectItem>
                    <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first ticket
              </p>
              <Button onClick={() => setShowNewTicketModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/app/tickets/${ticket.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          #{ticket.ticketNumber}
                          {ticket.originChatId && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              title="Created from chat"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md truncate">
                          {ticket.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">
                              {ticket.requesterName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ticket.requesterEmail}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)}>
                          {formatStatus(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ticket.assignedTo?.name || (
                          <span className="text-muted-foreground text-sm">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ticket._count.responses}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* New Ticket Modal/Form */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateTicketForm
                organizationId="cm3jykkxy0000xwnxrdfkxfnp" // TODO: Get from session
                mode="modal"
                onSuccess={(ticket) => {
                  setShowNewTicketModal(false);
                  loadTickets();
                  router.push(`/app/tickets/${ticket.id}`);
                }}
                onCancel={() => setShowNewTicketModal(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

