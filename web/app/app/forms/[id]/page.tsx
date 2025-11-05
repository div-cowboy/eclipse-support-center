"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import { ArrowLeft, Edit, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useParams } from "next/navigation";

interface FormDetails {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  isPublic: boolean;
  embedCode: string;
  submissionCount: number;
  lastSubmittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FormDetailPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams<{ id: string }>();

  const loadForm = async () => {
    try {
      const response = await fetch(`/api/forms/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setForm(data.form);
      } else {
        console.error("Failed to load form:", data.error);
      }
    } catch (error) {
      console.error("Error loading form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleCopyEmbedCode = async () => {
    if (!form) return;

    const embedUrl = `${window.location.origin}/embed/form?code=${form.embedCode}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;

    try {
      await navigator.clipboard.writeText(iframeCode);
      alert("Embed code copied to clipboard!");
    } catch {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Form not found</h2>
          <p className="text-muted-foreground mb-4">
            The form you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button asChild>
            <Link href="/app/forms">Back to Forms</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/forms">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{form.name}</h1>
            <Badge>{form.status}</Badge>
            {form.isPublic && <Badge variant="outline">Public</Badge>}
          </div>
          {form.description && (
            <p className="text-muted-foreground mt-1">{form.description}</p>
          )}
        </div>
        <Button onClick={() => router.push(`/app/forms/${form.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Form
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Form Details */}
        <Card>
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Embed Code
              </div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {form.embedCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmbedCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Status
              </div>
              <Badge className="mt-1">{form.status}</Badge>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Created
              </div>
              <div className="text-sm mt-1">
                {format(new Date(form.createdAt), "PPpp")}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Last Updated
              </div>
              <div className="text-sm mt-1">
                {format(new Date(form.updatedAt), "PPpp")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Total Submissions
              </div>
              <div className="text-2xl font-bold mt-1">
                {form.submissionCount}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Last Submission
              </div>
              <div className="text-sm mt-1">
                {form.lastSubmittedAt
                  ? format(new Date(form.lastSubmittedAt), "PPpp")
                  : "Never"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle>Embed Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy and paste this code into your website to embed the form:
          </p>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              {`<iframe src="${window.location.origin}/embed/form?code=${form.embedCode}" width="100%" height="600" frameborder="0"></iframe>`}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleCopyEmbedCode}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
