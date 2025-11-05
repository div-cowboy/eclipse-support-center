"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";
import { MessageSquare, Plus } from "lucide-react";

export function ChatsEmptyState() {
  const router = useRouter();

  const handleCreateNewChat = () => {
    router.push("/app/chats/new");
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-6 mb-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No support chats yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Start a new conversation to get help from our support team.
      </p>
      <Button onClick={handleCreateNewChat}>
        <Plus className="h-4 w-4 mr-2" />
        Start New Chat
      </Button>
    </div>
  );
}

