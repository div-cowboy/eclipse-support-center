"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatbotForm } from "@/components/chatbots/ChatbotForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";

interface Organization {
  id: string;
  name: string;
  description?: string;
  slug: string;
}

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  config?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    maxSources?: number;
    includeOrganizationDocs?: boolean;
    includeContextBlocks?: boolean;
    coreRules?: Record<string, unknown>;
    chatStartType?: "AI_ASSISTANT" | "HUMAN" | "CATEGORY_SELECT";
    requireNameAndEmail?: boolean;
  };
  organizationId: string;
}

export default function EditChatbotPage() {
  const params = useParams();
  const router = useRouter();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch chatbot data
        const chatbotResponse = await fetch(`/api/chatbots/${params.id}`);
        if (chatbotResponse.ok) {
          const chatbotData = await chatbotResponse.json();
          setChatbot(chatbotData);
        }

        // Fetch organizations
        const orgsResponse = await fetch("/api/organizations");
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          setOrganizations(orgsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleSubmit = async (data: {
    name: string;
    description?: string;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    organizationId: string;
    config?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      maxSources?: number;
      includeOrganizationDocs?: boolean;
      includeContextBlocks?: boolean;
      coreRules?: Record<string, unknown>;
      chatStartType?: "AI_ASSISTANT" | "HUMAN" | "CATEGORY_SELECT";
      requireNameAndEmail?: boolean;
    };
  }) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/chatbots/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push(`/app/chatbots/${params.id}`);
      } else {
        console.error("Failed to update chatbot");
      }
    } catch (error) {
      console.error("Error updating chatbot:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/app/chatbots/${params.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chatbot not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Chatbot</h1>
      </div>

      <ChatbotForm
        chatbot={chatbot}
        organizations={organizations}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={submitting}
      />
    </div>
  );
}
