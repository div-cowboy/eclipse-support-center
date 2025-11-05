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
import { Checkbox } from "@/components/shadcn/ui/checkbox";

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
    config?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      maxSources?: number;
      includeOrganizationDocs?: boolean;
      includeContextBlocks?: boolean;
      coreRules?: Record<string, unknown>;
      chatStartType?: "AI_ASSISTANT" | "HUMAN" | "CATEGORY_SELECT";
      requireNameAndEmail?: boolean;
    };
    organizationId: string;
  };
  organizations: Organization[];
  onSubmit: (data: {
    name: string;
    description?: string;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    organizationId: string;
    config?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      maxSources?: number;
      includeOrganizationDocs?: boolean;
      includeContextBlocks?: boolean;
      coreRules?: Record<string, unknown>;
      chatStartType?: "AI_ASSISTANT" | "HUMAN" | "CATEGORY_SELECT";
      requireNameAndEmail?: boolean;
    };
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
    systemPrompt: chatbot?.config?.systemPrompt || "",
    chatStartType: (chatbot?.config?.chatStartType || "AI_ASSISTANT") as
      | "AI_ASSISTANT"
      | "HUMAN"
      | "CATEGORY_SELECT",
    requireNameAndEmail: chatbot?.config?.requireNameAndEmail || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.organizationId) return;

    // Handle category select console log
    if (formData.chatStartType === "CATEGORY_SELECT") {
      console.log("Category select selected - this will be implemented later");
    }

    await onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      organizationId: formData.organizationId,
      config: {
        ...chatbot?.config,
        systemPrompt: formData.systemPrompt.trim() || undefined,
        chatStartType: formData.chatStartType,
        requireNameAndEmail: formData.requireNameAndEmail,
      },
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
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={formData.systemPrompt}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  systemPrompt: e.target.value,
                }))
              }
              placeholder="Define how the chatbot should behave and respond..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This prompt defines the chatbot&apos;s personality and behavior.
              It will be combined with core conversation rules and knowledge
              base context.
            </p>
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

          <div className="space-y-2">
            <Label htmlFor="chatStartType">How Chats Begin</Label>
            <Select
              value={formData.chatStartType}
              onValueChange={(
                value: "AI_ASSISTANT" | "HUMAN" | "CATEGORY_SELECT"
              ) => {
                if (value === "CATEGORY_SELECT") {
                  console.log(
                    "Category select selected - this will be implemented later"
                  );
                }
                setFormData((prev) => ({ ...prev, chatStartType: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AI_ASSISTANT">AI Assistant</SelectItem>
                <SelectItem value="HUMAN">Human (Escalation)</SelectItem>
                <SelectItem value="CATEGORY_SELECT">Category Select</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.chatStartType === "HUMAN" &&
                "Chats will start escalated to a human agent"}
              {formData.chatStartType === "CATEGORY_SELECT" &&
                "Users will select a category before starting the chat"}
              {formData.chatStartType === "AI_ASSISTANT" &&
                "Chats will start with the AI assistant"}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="requireNameAndEmail"
              checked={formData.requireNameAndEmail}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  requireNameAndEmail: checked === true,
                }))
              }
            />
            <Label
              htmlFor="requireNameAndEmail"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Require name and email before starting chat
            </Label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-black hover:bg-black/80 text-white"
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
