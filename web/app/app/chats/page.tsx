import { Metadata } from "next";
import { ChatsPageContent } from "@/components/chats/ChatsPageContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Support Chats | Eclipse Support Center",
    description:
      "Manage all customer conversations including embedded chatbot interactions and direct support inquiries.",
  };
}

export default function ChatsPage() {
  return <ChatsPageContent />;
}
