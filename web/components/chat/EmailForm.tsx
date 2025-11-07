"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Mail } from "lucide-react";

interface EmailFormProps {
  chatId: string;
  onEmailSubmitted: (email: string) => void;
  onError?: (error: string) => void;
}

const BASE_URL = "https://eclipse-support-center-git-main-wmg.vercel.app";
// const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export function EmailForm({
  chatId,
  onEmailSubmitted,
  onError,
}: EmailFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log when EmailForm is rendered
  useEffect(() => {
    console.log("[EmailForm] 📧 EmailForm component rendered:", {
      chatId,
      hasChatId: !!chatId,
    });
  }, [chatId]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log("[EmailForm] 📧 Email form submitted:", {
      email: email.trim(),
      chatId,
      hasChatId: !!chatId,
    });

    if (!email.trim()) {
      console.log("[EmailForm] ⚠️ Email validation failed: empty email");
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      console.log("[EmailForm] ⚠️ Email validation failed: invalid format", {
        email: email.trim(),
      });
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("[EmailForm] 📧 Sending email to API:", {
        url: `${BASE_URL}/api/embed/chats/${chatId}/email`,
        email: email.trim(),
        chatId,
      });

      const response = await fetch(`/api/embed/chats/${chatId}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      console.log("[EmailForm] 📧 Email API response:", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to save email",
        }));
        console.error("[EmailForm] ❌ Email API error:", {
          status: response.status,
          error: errorData,
        });
        throw new Error(errorData.error || "Failed to save email");
      }

      const data = await response.json();
      console.log("[EmailForm] ✅ Email saved successfully:", {
        data,
        email: email.trim(),
      });
      onEmailSubmitted(email.trim());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save email";
      console.error("[EmailForm] ❌ Email submission error:", {
        error: errorMessage,
        err,
      });
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted rounded-lg">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Business Email Address
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="your.email@example.com"
              className="pl-10 text-sm"
              disabled={isSubmitting}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="flex-shrink-0 bg-black text-white"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}
