// "use client";

import { ChatbotChatInterface } from "@/components/chat/ChatbotChatInterface";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat with Bot</h1>
          <p className="text-muted-foreground">
            Ask questions and get answers based on your organization&apos;s
            knowledge base
          </p>
        </div>
      </div>

      <ChatbotChatInterface chatbotId={id.toString()} />
    </div>
  );
}
