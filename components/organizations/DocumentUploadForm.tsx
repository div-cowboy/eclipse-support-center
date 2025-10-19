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
import { Plus, X, FileText, Upload } from "lucide-react";

export interface OrganizationDocument {
  id?: string;
  title: string;
  content: string;
  type:
    | "TEXT"
    | "POLICY"
    | "PROCEDURE"
    | "MANUAL"
    | "GUIDE"
    | "FAQ"
    | "ANNOUNCEMENT";
  metadata?: any;
}

interface DocumentUploadFormProps {
  documents: OrganizationDocument[];
  onDocumentsChange: (documents: OrganizationDocument[]) => void;
  className?: string;
}

export function DocumentUploadForm({
  documents,
  onDocumentsChange,
  className = "",
}: DocumentUploadFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "TEXT" as const,
  });

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    const newDocument: OrganizationDocument = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      type: formData.type,
    };

    onDocumentsChange([...documents, newDocument]);
    setFormData({ title: "", content: "", type: "TEXT" });
    setShowForm(false);
  };

  const removeDocument = (index: number) => {
    const updatedDocuments = documents.filter((_, i) => i !== index);
    onDocumentsChange(updatedDocuments);
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "TEXT":
        return "General text content and information";
      case "POLICY":
        return "Organizational policies and guidelines";
      case "PROCEDURE":
        return "Step-by-step procedures and workflows";
      case "MANUAL":
        return "User manuals and technical documentation";
      case "GUIDE":
        return "How-to guides and tutorials";
      case "FAQ":
        return "Frequently asked questions and answers";
      case "ANNOUNCEMENT":
        return "Important announcements and updates";
      default:
        return "";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "POLICY":
        return "📋";
      case "PROCEDURE":
        return "📝";
      case "MANUAL":
        return "📖";
      case "GUIDE":
        return "🎯";
      case "FAQ":
        return "❓";
      case "ANNOUNCEMENT":
        return "📢";
      default:
        return "📄";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Organization Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload text content that will be stored and indexed for your
            organization
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Document
        </Button>
      </div>

      {/* Existing Documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <Card key={doc.id || index} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-2xl">{getTypeIcon(doc.type)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {doc.type.toLowerCase()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {doc.content.substring(0, 100)}
                        {doc.content.length > 100 && "..."}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Document</CardTitle>
            <CardDescription>
              Add text content that will be stored in your organization's
              knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="e.g., Company Handbook"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Document Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(
                      value:
                        | "TEXT"
                        | "POLICY"
                        | "PROCEDURE"
                        | "MANUAL"
                        | "GUIDE"
                        | "FAQ"
                        | "ANNOUNCEMENT"
                    ) => setFormData((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="POLICY">Policy</SelectItem>
                      <SelectItem value="PROCEDURE">Procedure</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="GUIDE">Guide</SelectItem>
                      <SelectItem value="FAQ">FAQ</SelectItem>
                      <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
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
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Enter the document content..."
                  rows={6}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This content will be processed and stored in both the database
                  and vector database for semantic search.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!formData.title.trim() || !formData.content.trim()}
                  onClick={handleSubmit}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Add Document
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 && !showForm && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add documents to build your organization's knowledge base
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Document
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
