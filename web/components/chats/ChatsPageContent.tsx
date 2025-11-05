"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
} from "@tanstack/react-table";
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
import { Checkbox } from "@/components/shadcn/ui/checkbox";
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
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";
import { ChatsEmptyState } from "./ChatsEmptyState";

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

export function ChatsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<TraditionalChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "needs_response" | "my_chats">(
    "all"
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Get initial page from URL
  const getPageFromUrl = useCallback(() => {
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      return isNaN(page) || page < 1 ? 0 : page - 1; // Convert to 0-based index
    }
    return 0;
  }, [searchParams]);

  // Initialize pagination from URL
  const [initialPageIndex, setInitialPageIndex] = useState(() =>
    getPageFromUrl()
  );

  // Update URL when page changes
  const updateUrlWithPage = useCallback(
    (pageIndex: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (pageIndex === 0) {
        params.delete("page");
      } else {
        params.set("page", (pageIndex + 1).toString()); // Convert to 1-based for URL
      }
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Update pagination when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const pageFromUrl = getPageFromUrl();
    setInitialPageIndex(pageFromUrl);
  }, [searchParams, getPageFromUrl]);

  // Reset to page 0 when filter changes (to avoid being on a non-existent page)
  const prevFilterRef = React.useRef(filter);
  useEffect(() => {
    if (prevFilterRef.current !== filter) {
      // Reset to page 0 when filter changes (not on initial load)
      setInitialPageIndex(0);
      updateUrlWithPage(0);
    }
    prevFilterRef.current = filter;
  }, [filter, updateUrlWithPage]);

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
    const d = new Date(date);
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  };

  const getTimeSince = (date: Date) => {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const handleViewChat = useCallback((chatId: string) => {
    window.open(`/app/chats/${chatId}`, "_blank");
  }, []);

  const handleCreateNewChat = useCallback(() => {
    router.push("/app/chats/new");
  }, [router]);

  // Memoize columns to prevent unnecessary re-renders
  const columns: ColumnDef<TraditionalChat>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2"
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const chat = row.original;
          return (
            <div className="flex items-center gap-2">
              {getStatusIcon(chat.status)}
              <Badge
                variant="outline"
                className={`text-xs ${getStatusColor(chat.status)}`}
              >
                {chat.status}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2"
            >
              Title
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const chat = row.original;
          return (
            <div>
              <div className="font-medium">{chat.title}</div>
              {chat.chatbot && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  {chat.chatbot.name}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "organization",
        header: "Organization",
        cell: ({ row }) => {
          const chat = row.original;
          return chat.chatbot?.organization ? (
            <Badge variant="secondary" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {chat.chatbot.organization.name}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
      },
      {
        id: "escalation",
        header: "Escalation",
        cell: ({ row }) => {
          const chat = row.original;
          const isUrgent = chat.escalationRequested && !chat.assignedToId;
          return chat.escalationRequested ? (
            <div className="flex flex-col gap-1">
              <Badge
                variant="outline"
                className={`text-xs ${
                  isUrgent
                    ? "bg-amber-100 text-amber-800 border-amber-400 font-semibold dark:bg-amber-900 dark:text-amber-200 dark:border-amber-600"
                    : "bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                }`}
              >
                <PhoneCall className="h-3 w-3 mr-1" />
                {isUrgent ? "🚨 Urgent" : "Escalated"}
              </Badge>
              {chat.escalationRequestedAt && (
                <span className="text-xs text-muted-foreground">
                  {getTimeSince(chat.escalationRequestedAt)} ago
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
      },
      {
        id: "assignedTo",
        header: "Assigned To",
        cell: ({ row }) => {
          const chat = row.original;
          return chat.assignedTo ? (
            <Badge
              variant="outline"
              className="text-xs bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              {chat.assignedTo.name || chat.assignedTo.email}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          );
        },
      },
      {
        accessorKey: "_count.messages",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2"
            >
              Messages
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const chat = row.original;
          return (
            <Badge variant="secondary" className="text-xs">
              {chat._count?.messages || 0} messages
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2"
            >
              Created
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const chat = row.original;
          return (
            <span
              className="text-sm text-muted-foreground"
              suppressHydrationWarning
            >
              {formatDate(chat.createdAt)}
            </span>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2"
            >
              Last Updated
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const chat = row.original;
          return (
            <span
              className="text-sm text-muted-foreground"
              suppressHydrationWarning
            >
              {formatDate(chat.updatedAt)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const chat = row.original;
          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleViewChat(chat.id)}>
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
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [handleViewChat]
  );

  // Memoize filtered chats to prevent unnecessary recalculations
  const memoizedFilteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (filter === "needs_response") {
        return chat.escalationRequested && !chat.assignedToId;
      }
      if (filter === "my_chats") {
        return !!chat.assignedToId;
      }
      return true; // "all"
    });
  }, [chats, filter]);

  // Handle pagination changes
  const handlePaginationChange = useCallback(
    (updater: (old: number) => number) => {
      const newPageIndex = updater(initialPageIndex);
      setInitialPageIndex(newPageIndex);
      updateUrlWithPage(newPageIndex);
    },
    [initialPageIndex, updateUrlWithPage]
  );

  // Set up table
  const table = useReactTable({
    data: memoizedFilteredChats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
      pagination: {
        pageIndex: initialPageIndex,
        pageSize: 10,
      },
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    manualPagination: false,
  });

  // Sync table when URL changes (browser back/forward)
  useEffect(() => {
    const currentPageIndex = table.getState().pagination.pageIndex;
    if (currentPageIndex !== initialPageIndex) {
      table.setPageIndex(initialPageIndex);
    }
  }, [initialPageIndex, table]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  // Count escalations needing response
  const needsResponseCount = chats.filter(
    (chat) => chat.escalationRequested && !chat.assignedToId
  ).length;

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

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

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All Chats
          <Badge variant="secondary" className="ml-2">
            {chats.length}
          </Badge>
        </Button>
        <Button
          variant={filter === "needs_response" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("needs_response")}
          className={
            needsResponseCount > 0
              ? "border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-300"
              : ""
          }
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Needs Response
          {needsResponseCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 bg-amber-500 hover:bg-amber-600"
            >
              {needsResponseCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={filter === "my_chats" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("my_chats")}
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Assigned Chats
        </Button>
      </div>

      {/* Selected rows actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
          <span className="text-sm font-medium">
            {selectedCount} chat{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm">
              Archive Selected
            </Button>
            <Button variant="outline" size="sm" className="text-red-600">
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div>
        <div>
          {memoizedFilteredChats.length === 0 ? (
            <ChatsEmptyState />
          ) : (
            <>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const chat = row.original;
                        const isUrgent =
                          chat.escalationRequested && !chat.assignedToId;
                        return (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className={`cursor-pointer hover:bg-muted/50 ${
                              isUrgent
                                ? "bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500"
                                : ""
                            }`}
                            onClick={() => handleViewChat(chat.id)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    memoizedFilteredChats.length
                  )}{" "}
                  of {memoizedFilteredChats.length} chats
                  {selectedCount > 0 && ` (${selectedCount} selected)`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newIndex = Math.max(0, initialPageIndex - 1);
                      handlePaginationChange(() => newIndex);
                      table.setPageIndex(newIndex);
                    }}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: table.getPageCount() },
                      (_, i) => i + 1
                    )
                      .filter((page) => {
                        const currentPage =
                          table.getState().pagination.pageIndex + 1;
                        const totalPages = table.getPageCount();
                        // Show first page, last page, current page, and pages around current
                        if (totalPages <= 7) return true;
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, idx, arr) => {
                        const currentPage =
                          table.getState().pagination.pageIndex + 1;
                        const showEllipsis =
                          idx > 0 && arr[idx - 1] !== page - 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                                ...
                              </span>
                            )}
                            <Button
                              variant={
                                page === currentPage ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => {
                                const newIndex = page - 1;
                                handlePaginationChange(() => newIndex);
                                table.setPageIndex(newIndex);
                              }}
                              className="h-9 w-9 p-0"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newIndex = Math.min(
                        table.getPageCount() - 1,
                        initialPageIndex + 1
                      );
                      handlePaginationChange(() => newIndex);
                      table.setPageIndex(newIndex);
                    }}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

