"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormBuilder } from "@/components/forms/FormBuilder";
import type { FormField, FormSettings } from "@/lib/form-service";
import { TicketPriority } from "@prisma/client";

interface FormData {
  id: string;
  name: string;
  description?: string | null;
  fields: FormField[];
  settings: FormSettings;
  defaultCategory?: string | null;
  defaultPriority?: TicketPriority | null;
  tags: string[];
}

export default function EditFormPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormData | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>({});
  const [defaultCategory, setDefaultCategory] = useState<string | undefined>();
  const [defaultPriority, setDefaultPriority] = useState<TicketPriority | null>(
    null
  );
  const [tags, setTags] = useState<string[]>([]);

  const params = useParams<{ id: string }>();

  const loadForm = async () => {
    try {
      const response = await fetch(`/api/forms/${params.id}`);
      const data = await response.json();

      if (data.success) {
        const formData = data.form;
        setForm(formData);
        setFormName(formData.name || "");
        setFormDescription(formData.description || "");
        setFields((formData.fields as FormField[]) || []);
        setSettings((formData.settings as FormSettings) || {});
        setDefaultCategory(formData.defaultCategory || undefined);
        setDefaultPriority(formData.defaultPriority || null);
        setTags(formData.tags || []);
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

  const handleSave = async () => {
    if (!formName.trim()) {
      alert("Please enter a form name");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/forms/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          fields,
          settings,
          defaultCategory: defaultCategory || undefined,
          defaultPriority: defaultPriority || undefined,
          tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/app/forms/${params.id}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving form:", error);
      alert("Failed to save form. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuilderChange = (data: {
    fields: FormField[];
    settings: FormSettings;
    defaultCategory?: string;
    defaultPriority?: TicketPriority | null;
    tags?: string[];
  }) => {
    setFields(data.fields);
    setSettings(data.settings);
    if (data.defaultCategory !== undefined) {
      setDefaultCategory(data.defaultCategory);
    }
    if (data.defaultPriority !== undefined) {
      setDefaultPriority(data.defaultPriority);
    }
    if (data.tags !== undefined) {
      setTags(data.tags);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/app/forms/${params.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Form
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Form</h1>
            <p className="text-muted-foreground mt-1">
              Customize your form fields, settings, and styling
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Form Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Form Name *</Label>
            <Input
              id="name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contact Form"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="A brief description of this form"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Builder */}
      <FormBuilder
        fields={fields}
        settings={settings}
        defaultCategory={defaultCategory}
        defaultPriority={defaultPriority}
        tags={tags}
        onChange={handleBuilderChange}
      />
    </div>
  );
}
