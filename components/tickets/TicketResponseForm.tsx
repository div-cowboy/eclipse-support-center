"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { Label } from "@/components/shadcn/ui/label";
import { Loader2 } from "lucide-react";

interface TicketResponseFormProps {
  ticketId: string;
  onSuccess?: (response: any) => void;
}

export function TicketResponseForm({
  ticketId,
  onSuccess,
}: TicketResponseFormProps) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Response content is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          isInternal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add response");
      }

      setContent("");
      setIsInternal(false);

      if (onSuccess) {
        onSuccess(data.response);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div>
        <Label htmlFor="response">
          Response <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="response"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your response here..."
          rows={6}
          className="mt-1.5"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isInternal"
          checked={isInternal}
          onChange={(e) => setIsInternal(e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label htmlFor="isInternal" className="cursor-pointer">
          Internal note (not visible to customer)
        </Label>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="submit" disabled={isLoading || !content.trim()}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isInternal ? "Add Internal Note" : "Send Response"}
        </Button>
      </div>
    </form>
  );
}

