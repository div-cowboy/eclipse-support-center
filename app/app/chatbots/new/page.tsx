"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { ArrowLeft } from "lucide-react";
import { ChatbotForm } from "@/components/chatbots/ChatbotForm";

interface Organization {
  id: string;
  name: string;
  description?: string;
  slug: string;
}

export default function NewChatbotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data);
        } else {
          console.error("Failed to fetch organizations");
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setOrganizationsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleSubmit = async (data: {
    name: string;
    description?: string;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    organizationId: string;
    config?: Record<string, unknown>;
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/chatbots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newChatbot = await response.json();
        // Redirect to the new chatbot's detail page
        router.push(`/app/chatbots/${newChatbot.id}`);
      } else {
        const error = await response.json();
        console.error("Failed to create chatbot:", error);
        // You could add toast notifications here
        alert("Failed to create chatbot. Please try again.");
      }
    } catch (error) {
      console.error("Error creating chatbot:", error);
      alert("An error occurred while creating the chatbot.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (organizationsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chatbots
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Create New Chatbot
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading organizations...</div>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chatbots
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Create New Chatbot
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              No Organizations Found
            </h3>
            <p className="text-muted-foreground mb-4">
              You need to be part of an organization to create chatbots.
            </p>
            <Button onClick={handleCancel}>Back to Chatbots</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chatbots
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Create New Chatbot
        </h1>
      </div>

      <ChatbotForm
        organizations={organizations}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}
