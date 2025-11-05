"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Badge } from "@/components/shadcn/ui/badge";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { Loader2, X, Search } from "lucide-react";
import { TicketPriority } from "@prisma/client";

export interface CreateTicketFormProps {
  organizationId: string;
  onSuccess?: (ticket: any) => void;
  onCancel?: () => void;
  defaultValues?: {
    subject?: string;
    description?: string;
    priority?: TicketPriority;
    category?: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterId?: string;
    tags?: string[];
    originChatId?: string;
  };
  mode?: "modal" | "page";
}

const CATEGORIES = [
  "Technical",
  "Billing",
  "General",
  "Feature Request",
  "Bug Report",
  "Account",
  "Other",
];

export function CreateTicketForm({
  organizationId,
  onSuccess,
  onCancel,
  defaultValues,
  mode = "page",
}: CreateTicketFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);

  // Form state
  const [subject, setSubject] = useState(defaultValues?.subject || "");
  const [description, setDescription] = useState(
    defaultValues?.description || ""
  );
  const [priority, setPriority] = useState<TicketPriority>(
    defaultValues?.priority || TicketPriority.MEDIUM
  );
  const [category, setCategory] = useState(defaultValues?.category || "");
  const [requesterName, setRequesterName] = useState(
    defaultValues?.requesterName || ""
  );
  const [requesterEmail, setRequesterEmail] = useState(
    defaultValues?.requesterEmail || ""
  );
  const [requesterId, setRequesterId] = useState(
    defaultValues?.requesterId || ""
  );
  const [tags, setTags] = useState<string[]>(defaultValues?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [assignToMe, setAssignToMe] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user for auto-assign
  useState(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
        }
      });
  });

  // Search for existing users
  const handleUserSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}&organizationId=${organizationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleSelectUser = (user: any) => {
    setRequesterName(user.name || "");
    setRequesterEmail(user.email || "");
    setRequesterId(user.id);
    setUserSearchResults([]);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    if (!requesterName.trim()) {
      setError("Requester name is required");
      return;
    }

    if (!requesterEmail.trim()) {
      setError("Requester email is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          category: category || undefined,
          requesterName: requesterName.trim(),
          requesterEmail: requesterEmail.trim(),
          requesterId: requesterId || undefined,
          assignedToId:
            assignToMe && currentUserId ? currentUserId : undefined,
          tags: tags.length > 0 ? tags : undefined,
          originChatId: defaultValues?.originChatId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }

      if (data.success && onSuccess) {
        onSuccess(data.ticket);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create ticket");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Requester Information */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-3">Requester Information</h3>
          
          {/* User Search */}
          <div className="mb-4">
            <Label htmlFor="userSearch">Search Existing User</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="userSearch"
                placeholder="Search by name or email..."
                onChange={(e) => handleUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {userSearchResults.length > 0 && (
              <Card className="mt-2">
                <CardContent className="p-2">
                  {userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors"
                    >
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="requesterName">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="requesterName"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="John Doe"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="requesterEmail">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="requesterEmail"
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Ticket Details</h3>

        <div>
          <Label htmlFor="subject">
            Subject <span className="text-red-500">*</span>
          </Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of the issue"
            required
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="description">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the issue..."
            required
            rows={6}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as TicketPriority)}
            >
              <SelectTrigger id="priority" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                <SelectItem value={TicketPriority.CRITICAL}>
                  Critical
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label htmlFor="tags">Tags</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tags..."
            />
            <Button type="button" onClick={handleAddTag} variant="outline">
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Auto-assign */}
        {currentUserId && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="assignToMe"
              checked={assignToMe}
              onChange={(e) => setAssignToMe(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="assignToMe" className="cursor-pointer">
              Assign to me
            </Label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Ticket
        </Button>
      </div>
    </form>
  );
}

