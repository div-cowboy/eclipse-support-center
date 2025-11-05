"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import {
  DocumentUploadForm,
  OrganizationDocument,
} from "@/components/organizations/DocumentUploadForm";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
  });
  const [documents, setDocuments] = useState<OrganizationDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    // Ensure slug is generated if it's empty
    const finalFormData = {
      ...formData,
      slug: formData.slug.trim() || generateSlug(formData.name.trim()),
    };

    // Validate documents if any are provided
    if (documents.length > 0) {
      const invalidDocuments = documents.filter(
        (doc) => !doc.title.trim() || !doc.content.trim()
      );
      if (invalidDocuments.length > 0) {
        toast.error("All documents must have both title and content");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const requestBody = {
        ...finalFormData,
        documents: documents.length > 0 ? documents : undefined,
      };

      console.log("Creating organization with data:", requestBody);

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        await response.json();
        toast.success(
          documents.length > 0
            ? `Organization created successfully with ${
                documents.length
              } document${documents.length !== 1 ? "s" : ""}!`
            : "Organization created successfully!"
        );
        // Redirect to organizations page
        router.push("/app/organizations");
      } else {
        const error = await response.json();
        console.error("API Error:", error);
        toast.error(
          error.error || error.message || "Failed to create organization"
        );
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast.error("Failed to create organization. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Organization
          </h1>
          <p className="text-muted-foreground">
            Create a new organization to manage your chatbots and team members
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Provide the basic information for your new organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter organization name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="organization-slug"
                required
              />
              <p className="text-sm text-muted-foreground">
                This will be used in URLs and must be unique
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your organization"
                rows={3}
              />
            </div>
            <DocumentUploadForm
              documents={documents}
              onDocumentsChange={setDocuments}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Organization"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
