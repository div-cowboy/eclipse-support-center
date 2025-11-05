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
  FileText,
  Loader2,
  Calendar,
  Eye,
  Edit,
  Copy,
  Archive,
} from "lucide-react";
import { SupportFormStatus } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

interface FormListItem {
  id: string;
  name: string;
  description?: string | null;
  status: SupportFormStatus;
  isPublic: boolean;
  embedCode: string;
  submissionCount: number;
  lastSubmittedAt?: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
  };
}

export default function FormsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      loadOrganizations();
    }
  }, [session]);

  useEffect(() => {
    if (session?.user && selectedOrgId) {
      loadForms();
    }
  }, [session, selectedOrgId, searchQuery, statusFilter, page]);

  const loadOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        // Auto-select first organization if available
        if (data.length > 0 && !selectedOrgId) {
          setSelectedOrgId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    }
  };

  const loadForms = async () => {
    if (!session?.user || !selectedOrgId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId: selectedOrgId,
        page: page.toString(),
        limit: "20",
      });

      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/forms?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to load forms:", errorData.error || `HTTP ${response.status}`);
        setForms([]);
        setTotalPages(1);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setForms(data.forms || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        console.error("Failed to load forms:", data.error || "Unknown error");
        // Show empty state on error
        setForms([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error loading forms:", error);
      setForms([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyEmbedCode = async (embedCode: string) => {
    const embedUrl = `${window.location.origin}/embed/form?code=${embedCode}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;

    try {
      await navigator.clipboard.writeText(iframeCode);
      alert("Embed code copied to clipboard!");
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = iframeCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Embed code copied to clipboard!");
    }
  };

  const getStatusBadgeVariant = (status: SupportFormStatus) => {
    switch (status) {
      case SupportFormStatus.ACTIVE:
        return "default";
      case SupportFormStatus.INACTIVE:
        return "secondary";
      case SupportFormStatus.ARCHIVED:
        return "outline";
      default:
        return "default";
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Forms</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage embeddable support forms
          </p>
        </div>
        <Button onClick={() => router.push("/app/forms/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {organizations.length > 1 && (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={SupportFormStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={SupportFormStatus.INACTIVE}>
                  Inactive
                </SelectItem>
                <SelectItem value={SupportFormStatus.ARCHIVED}>
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Forms List */}
      <Card>
        <CardHeader>
          <CardTitle>Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No forms found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first form"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => router.push("/app/forms/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Form
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Last Submitted</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{form.name}</div>
                        {form.description && (
                          <div className="text-sm text-muted-foreground">
                            {form.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(form.status)}>
                        {form.status}
                      </Badge>
                      {form.isPublic && (
                        <Badge variant="outline" className="ml-2">
                          Public
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{form.submissionCount}</TableCell>
                    <TableCell>
                      {form.lastSubmittedAt
                        ? format(new Date(form.lastSubmittedAt), "MMM dd, yyyy")
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(form.createdAt), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/app/forms/${form.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/app/forms/${form.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyEmbedCode(form.embedCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

