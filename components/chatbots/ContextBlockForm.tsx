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

interface ContextBlockFormProps {
  contextBlock?: {
    id: string;
    title: string;
    content: string;
    type:
      | "TEXT"
      | "CODE"
      | "DOCUMENTATION"
      | "FAQ"
      | "TROUBLESHOOTING"
      | "TUTORIAL";
    metadata?: any;
  };
  onSubmit: (data: {
    title: string;
    content: string;
    type:
      | "TEXT"
      | "CODE"
      | "DOCUMENTATION"
      | "FAQ"
      | "TROUBLESHOOTING"
      | "TUTORIAL";
    metadata?: any;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ContextBlockForm({
  contextBlock,
  onSubmit,
  onCancel,
  loading = false,
}: ContextBlockFormProps) {
  const [formData, setFormData] = useState({
    title: contextBlock?.title || "",
    content: contextBlock?.content || "",
    type: contextBlock?.type || ("TEXT" as const),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    await onSubmit({
      title: formData.title.trim(),
      content: formData.content.trim(),
      type: formData.type,
    });
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "TEXT":
        return "General text content and information";
      case "CODE":
        return "Code examples, snippets, and technical implementations";
      case "DOCUMENTATION":
        return "Official documentation and reference materials";
      case "FAQ":
        return "Frequently asked questions and answers";
      case "TROUBLESHOOTING":
        return "Problem-solving guides and error solutions";
      case "TUTORIAL":
        return "Step-by-step tutorials and learning materials";
      default:
        return "";
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {contextBlock ? "Edit Context Block" : "Add Context Block"}
        </CardTitle>
        <CardDescription>
          {contextBlock
            ? "Update the knowledge base content for your chatbot."
            : "Add new knowledge to your chatbot's context. This content will be vectorized and used for intelligent responses."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Eclipse IDE Installation Guide"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Content Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(
                  value:
                    | "TEXT"
                    | "CODE"
                    | "DOCUMENTATION"
                    | "FAQ"
                    | "TROUBLESHOOTING"
                    | "TUTORIAL"
                ) => setFormData((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="CODE">Code</SelectItem>
                  <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                  <SelectItem value="FAQ">FAQ</SelectItem>
                  <SelectItem value="TROUBLESHOOTING">
                    Troubleshooting
                  </SelectItem>
                  <SelectItem value="TUTORIAL">Tutorial</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {getTypeDescription(formData.type)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="Enter the knowledge content that will be used to train your chatbot..."
              rows={12}
              className="font-mono text-sm"
              required
            />
            <p className="text-sm text-muted-foreground">
              This content will be processed and stored in the vector database
              for semantic search and AI responses.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading || !formData.title.trim() || !formData.content.trim()
              }
            >
              {loading
                ? "Saving..."
                : contextBlock
                ? "Update Context Block"
                : "Add Context Block"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
