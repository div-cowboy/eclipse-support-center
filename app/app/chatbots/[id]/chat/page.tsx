// "use client";

import { ChatbotChatInterface } from "@/components/chat/ChatbotChatInterface";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

      <ChatbotChatInterface chatbotId={id} />
    </div>
  );
}
