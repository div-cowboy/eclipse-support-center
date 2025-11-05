"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { Bot, Plus } from "lucide-react";

export function ChatbotsEmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Bot className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No chatbots yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Create your first chatbot to start having conversations and building a
        knowledge base.
      </p>
      <Button onClick={() => router.push("/app/chatbots/new")}>
        <Plus className="h-4 w-4 mr-2" />
        Create Chatbot
      </Button>
    </div>
  );
}

