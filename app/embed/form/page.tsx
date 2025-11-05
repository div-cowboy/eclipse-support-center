"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/shadcn/ui/checkbox";
import { Button } from "@/components/shadcn/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/ui/radio-group";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { FormField, FormSettings } from "@/lib/form-service";

interface FormData {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
  defaultValues?: Record<string, any>;
}

type SubmissionState = "idle" | "submitting" | "success" | "error";

function EmbedFormContent() {
  const searchParams = useSearchParams();
  const embedCode = searchParams.get("code");

  const [form, setForm] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string>("");
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [formLoadTime, setFormLoadTime] = useState<number>(0);

  useEffect(() => {
    if (embedCode) {
      // Set form load time (for time-based validation)
      setFormLoadTime(Date.now());
      loadForm();
    }
  }, [embedCode]);

  const loadForm = async () => {
    try {
      const response = await fetch(`/api/forms/embed/${embedCode}`);
      const data = await response.json();

      if (data.success) {
        setForm(data.form);
        // Set CSRF token from response
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
        // Apply default values
        if (data.form.defaultValues) {
          setFormData(data.form.defaultValues);
        }
      } else {
        console.error("Failed to load form:", data.error);
        setSubmissionState("error");
        setSubmissionError(data.error || "Failed to load form");
      }
    } catch (error) {
      console.error("Error loading form:", error);
      setSubmissionState("error");
      setSubmissionError("Failed to load form");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!form) return false;

    const newErrors: Record<string, string> = {};
    const fields = form.fields || [];

    for (const field of fields) {
      const value = formData[field.name];

      if (field.required && (value === undefined || value === null || value === "")) {
        newErrors[field.name] = `${field.label} is required`;
      }

      // Type-specific validation
      if (value && field.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = "Please enter a valid email address";
        }
      }

      if (value && field.type === "number") {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[field.name] = "Please enter a valid number";
        } else {
          if (field.validation?.min !== undefined && numValue < field.validation.min) {
            newErrors[field.name] = `Value must be at least ${field.validation.min}`;
          }
          if (field.validation?.max !== undefined && numValue > field.validation.max) {
            newErrors[field.name] = `Value must be at most ${field.validation.max}`;
          }
        }
      }

      if (value && (field.type === "text" || field.type === "textarea")) {
        const strValue = String(value);
        if (field.validation?.minLength && strValue.length < field.validation.minLength) {
          newErrors[field.name] = `Must be at least ${field.validation.minLength} characters`;
        }
        if (field.validation?.maxLength && strValue.length > field.validation.maxLength) {
          newErrors[field.name] = `Must be at most ${field.validation.maxLength} characters`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form || !embedCode) return;

    if (!validateForm()) {
      return;
    }

    setSubmissionState("submitting");
    setSubmissionError("");

    try {
      // Add security fields to form data
      const submissionData = {
        ...formData,
        _csrf_token: csrfToken, // CSRF token
        _form_timestamp: formLoadTime.toString(), // Timestamp honeypot (filled by JS)
        _form_load_time: formLoadTime.toString(), // Form load time for validation
        // Honeypot fields (hidden, bots may fill these)
        website: "", // Field name honeypot
        url: "", // Field name honeypot
      };

      const response = await fetch(`/api/forms/embed/${embedCode}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: submissionData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmissionState("success");
        // Reset form if redirect is not set
        if (!form.settings?.redirectUrl) {
          setTimeout(() => {
            setFormData({});
            setSubmissionState("idle");
          }, 3000);
        } else {
          // Redirect after short delay
          setTimeout(() => {
            window.location.href = form.settings.redirectUrl!;
          }, 2000);
        }
      } else {
        setSubmissionState("error");
        setSubmissionError(data.error || "Failed to submit form");
        if (data.errors) {
          const fieldErrors: Record<string, string> = {};
          for (const error of data.errors) {
            fieldErrors[error.field] = error.message;
          }
          setErrors(fieldErrors);
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmissionState("error");
      setSubmissionError("Failed to submit form. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Form not found</h2>
          <p className="text-muted-foreground">
            {submissionError || "The form you&apos;re looking for doesn&apos;t exist or has been deleted."}
          </p>
        </div>
      </div>
    );
  }

  const sortedFields = [...(form.fields || [])].sort((a, b) => a.order - b.order);
  const settings = form.settings || {};
  const theme = settings.theme || {};

  const themeStyle = {
    "--primary-color": theme.primaryColor || "#000000",
    "--border-radius": theme.borderRadius || "4px",
    "--font-family": theme.fontFamily || "inherit",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen p-4 md:p-8" style={themeStyle}>
      <div className="max-w-2xl mx-auto">
        {submissionState === "success" ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
            <p className="text-muted-foreground mb-4">
              {settings.successMessage || "Your form has been submitted successfully."}
            </p>
            {settings.redirectUrl && (
              <p className="text-sm text-muted-foreground">
                You will be redirected shortly...
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            {form.name && (
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-family)" }}>
                {form.name}
              </h1>
            )}
            {form.description && (
              <p className="text-muted-foreground mb-6">{form.description}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot fields (hidden, bots may fill these) */}
              <div style={{ display: "none" }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website || ""}
                  onChange={() => {}} // No-op, but bots may fill it
                />
                <input
                  type="text"
                  name="url"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.url || ""}
                  onChange={() => {}} // No-op, but bots may fill it
                />
              </div>

              {sortedFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {field.type === "text" && (
                    <Input
                      id={field.id}
                      type="text"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      style={{
                        borderColor: errors[field.name] ? "#ef4444" : "var(--primary-color)",
                        borderRadius: "var(--border-radius)",
                        fontFamily: "var(--font-family)",
                      }}
                    />
                  )}

                  {field.type === "email" && (
                    <Input
                      id={field.id}
                      type="email"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      style={{
                        borderColor: errors[field.name] ? "#ef4444" : "var(--primary-color)",
                        borderRadius: "var(--border-radius)",
                        fontFamily: "var(--font-family)",
                      }}
                    />
                  )}

                  {field.type === "textarea" && (
                    <Textarea
                      id={field.id}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={4}
                      style={{
                        borderColor: errors[field.name] ? "#ef4444" : "var(--primary-color)",
                        borderRadius: "var(--border-radius)",
                        fontFamily: "var(--font-family)",
                      }}
                    />
                  )}

                  {field.type === "number" && (
                    <Input
                      id={field.id}
                      type="number"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      min={field.validation?.min}
                      max={field.validation?.max}
                      style={{
                        borderColor: errors[field.name] ? "#ef4444" : "var(--primary-color)",
                        borderRadius: "var(--border-radius)",
                        fontFamily: "var(--font-family)",
                      }}
                    />
                  )}

                  {field.type === "date" && (
                    <Input
                      id={field.id}
                      type="date"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      required={field.required}
                      style={{
                        borderColor: errors[field.name] ? "#ef4444" : "var(--primary-color)",
                        borderRadius: "var(--border-radius)",
                        fontFamily: "var(--font-family)",
                      }}
                    />
                  )}

                  {field.type === "select" && field.options && (
                    <Select
                      value={formData[field.name] || ""}
                      onValueChange={(value) => handleFieldChange(field.name, value)}
                    >
                      <SelectTrigger
                        style={{
                          borderColor: errors[field.name] ? "#ef4444" : "var(--primary-color)",
                          borderRadius: "var(--border-radius)",
                          fontFamily: "var(--font-family)",
                        }}
                      >
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option, index) => (
                          <SelectItem key={index} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {field.type === "radio" && field.options && (
                    <RadioGroup
                      value={formData[field.name] || ""}
                      onValueChange={(value) => handleFieldChange(field.name, value)}
                      required={field.required}
                    >
                      {field.options.map((option, index) => (
                        <RadioGroupItem
                          key={index}
                          value={option.value}
                          id={`${field.id}-${index}`}
                        >
                          {option.label}
                        </RadioGroupItem>
                      ))}
                    </RadioGroup>
                  )}

                  {field.type === "checkbox" && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={formData[field.name] || false}
                        onCheckedChange={(checked) =>
                          handleFieldChange(field.name, checked)
                        }
                        required={field.required}
                      />
                      <Label htmlFor={field.id} className="cursor-pointer font-normal">
                        {field.placeholder || field.label}
                      </Label>
                    </div>
                  )}

                  {field.type === "file" && (
                    <Input
                      id={field.id}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFieldChange(field.name, file.name);
                        }
                      }}
                      required={field.required}
                    />
                  )}

                  {errors[field.name] && (
                    <p className="text-sm text-destructive">{errors[field.name]}</p>
                  )}
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}

              {submissionState === "error" && submissionError && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                  <p className="text-sm text-destructive">{submissionError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={submissionState === "submitting"}
                className="w-full"
                style={{
                  backgroundColor: settings.submitButton?.color || "var(--primary-color)",
                  borderRadius: "var(--border-radius)",
                  fontFamily: "var(--font-family)",
                }}
              >
                {submissionState === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  settings.submitButton?.text || "Submit"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmbedFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <EmbedFormContent />
    </Suspense>
  );
}

