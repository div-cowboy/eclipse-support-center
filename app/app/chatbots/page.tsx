import { Metadata } from "next";
import { ChatbotsPageContent } from "@/components/chatbots/ChatbotsPageContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Chatbots | Eclipse Support Center",
    description: "Manage your AI chatbots and their conversations.",
  };
}

export default function ChatbotsPage() {
  return <ChatbotsPageContent />;
}
