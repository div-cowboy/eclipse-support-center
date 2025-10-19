"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";

interface Organization {
  id: string;
  name: string;
  description?: string;
  slug: string;
}

interface ChatbotFormProps {
  chatbot?: {
    id: string;
    name: string;
    description?: string;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    config?: any;
    organizationId: string;
  };
  organizations: Organization[];
  onSubmit: (data: {
    name: string;
    description?: string;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    organizationId: string;
    config?: any;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ChatbotForm({
  chatbot,
  organizations,
  onSubmit,
  onCancel,
  loading = false,
}: ChatbotFormProps) {
  const [formData, setFormData] = useState({
    name: chatbot?.name || "",
    description: chatbot?.description || "",
    status: chatbot?.status || ("ACTIVE" as const),
    organizationId: chatbot?.organizationId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.organizationId) return;

    await onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      organizationId: formData.organizationId,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{chatbot ? "Edit Chatbot" : "Create New Chatbot"}</CardTitle>
        <CardDescription>
          {chatbot
            ? "Update your chatbot's settings and configuration."
            : "Create a new AI chatbot to provide intelligent support for Eclipse development issues."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organization">Organization *</Label>
            <Select
              value={formData.organizationId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, organizationId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Eclipse IDE Support Bot"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe what this chatbot helps with..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "ACTIVE" | "INACTIVE" | "ARCHIVED") =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading || !formData.name.trim() || !formData.organizationId
              }
            >
              {loading
                ? "Saving..."
                : chatbot
                ? "Update Chatbot"
                : "Create Chatbot"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
