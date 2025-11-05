import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enhancedChatbotService } from "@/lib/chatbot-service-enhanced";

// GET /api/embed/chatbots/[id] - Get chatbot info for embedding (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get chatbot info without authentication for embedding
    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: id,
        status: "ACTIVE", // Only allow active chatbots to be embedded
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Check if chatbot allows embedding (you might want to add this field to your schema)
    // For now, we'll allow all active chatbots to be embedded

    return NextResponse.json({
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description,
      organization: chatbot.organization,
    });
  } catch (error) {
    console.error("Error getting chatbot info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
