"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface Organization {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  createdAt: string;
  users: { id: string }[];
  chatbots: { id: string }[];
  documents?: {
    id: string;
    title: string;
    content: string;
    type: string;
    metadata: any;
    createdAt: string;
  }[];
}

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
  });
  const [documents, setDocuments] = useState<OrganizationDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await fetch(`/api/organizations/${organizationId}`);
        if (response.ok) {
          const data = await response.json();
          setOrganization(data);
          setFormData({
            name: data.name,
            description: data.description || "",
            slug: data.slug,
          });
          // Populate documents if they exist
          if (data.documents && Array.isArray(data.documents)) {
            const formattedDocuments = data.documents.map((doc: any) => ({
              id: doc.id,
              title: doc.title,
              content: doc.content,
              type: doc.type,
              metadata: doc.metadata,
            }));
            setDocuments(formattedDocuments);
          }
        } else {
          toast.error("Failed to load organization");
          router.push("/app/organizations");
        }
      } catch (error) {
        console.error("Failed to fetch organization:", error);
        toast.error("Failed to load organization");
        router.push("/app/organizations");
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchOrganization();
    }
  }, [organizationId, router]);

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

      console.log("Updating organization with data:", requestBody);

      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        await response.json();
        toast.success("Organization updated successfully!");
        // Redirect to organizations page
        router.push("/app/organizations");
      } else {
        const error = await response.json();
        console.error("API Error:", error);
        toast.error(
          error.error || error.message || "Failed to update organization"
        );
      }
    } catch (error) {
      console.error("Failed to update organization:", error);
      toast.error("Failed to update organization. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Organization deleted successfully!");
        router.push("/app/organizations");
      } else {
        const error = await response.json();
        console.error("API Error:", error);
        toast.error(
          error.error || error.message || "Failed to delete organization"
        );
      }
    } catch (error) {
      console.error("Failed to delete organization:", error);
      toast.error("Failed to delete organization. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Edit Organization
            </h1>
            <p className="text-muted-foreground">
              Loading organization details...
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Edit Organization
            </h1>
            <p className="text-muted-foreground">Organization not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Edit Organization
          </h1>
          <p className="text-muted-foreground">
            Update your organization details and settings
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update the information for your organization
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
                {isSubmitting ? "Updating..." : "Update Organization"}
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

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Once you delete an organization, there is no going back. Please be
            certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
            >
              Delete Organization
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-red-600 font-medium">
                Are you absolutely sure you want to delete this organization?
                This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Organization"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 py-3 px-6 rounded-lg"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
