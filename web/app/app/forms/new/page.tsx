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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { FormBuilder } from "@/components/forms/FormBuilder";
import type { FormField, FormSettings } from "@/lib/form-service";
import { TicketPriority } from "@prisma/client";

interface Organization {
  id: string;
  name: string;
  description?: string;
}

export default function NewFormPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>({
    submitButton: { text: "Submit" },
    successMessage: "Thank you for your submission!",
    requireEmail: true,
    requireName: true,
  });
  const [defaultCategory, setDefaultCategory] = useState<string | undefined>();
  const [defaultPriority, setDefaultPriority] = useState<TicketPriority | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        // Auto-select first organization if only one exists
        if (data.length === 1) {
          setOrganizationId(data[0].id);
        }
      } else {
        console.error("Failed to load organizations");
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      alert("Please enter a form name");
      return;
    }

    if (!organizationId) {
      alert("Please select an organization");
      return;
    }

    if (fields.length === 0) {
      alert("Please add at least one field to the form");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          organizationId,
          fields,
          settings,
          defaultCategory: defaultCategory || undefined,
          defaultPriority: defaultPriority || undefined,
          tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/app/forms/${data.form.id}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating form:", error);
      alert("Failed to create form. Please try again.");
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/forms">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Form</h1>
            <p className="text-muted-foreground mt-1">
              Create a new embeddable support form
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting || !organizationId || isLoadingOrgs}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Form Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationId">Organization *</Label>
              {isLoadingOrgs ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Loading organizations...
                  </span>
                </div>
              ) : organizations.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No organizations found. Please create an organization first.
                </div>
              ) : (
                <Select
                  value={organizationId}
                  onValueChange={setOrganizationId}
                  required
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
              )}
            </div>

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
      </form>
    </div>
  );
}
