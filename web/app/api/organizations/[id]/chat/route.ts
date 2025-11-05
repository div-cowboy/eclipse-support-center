import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { chatbotService } from "@/lib/chatbot-service";
import { ChatMessage } from "@/lib/chatbot-service";

// POST /api/organizations/[id]/chat - Chat with organization's knowledge base
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationHistory = [], stream = false } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user has access to this organization
    const organization = await prisma.organization.findFirst({
      where: {
        id: id,
        users: {
          some: {
            id: user.id,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if chatbot service is configured
    const serviceStatus = chatbotService.getStatus();
    if (!serviceStatus.fullyConfigured) {
      return NextResponse.json(
        {
          error: "Chatbot service not fully configured",
          details: {
            groqConfigured: serviceStatus.groqConfigured,
            vectorServiceAvailable: serviceStatus.vectorServiceAvailable,
          },
        },
        { status: 503 }
      );
    }

    // Handle streaming response
    if (stream) {
      return handleStreamingResponse(message, id, conversationHistory);
    }

    // Handle regular response
    try {
      const response = await chatbotService.generateResponse(
        message,
        id,
        conversationHistory,
        {
          maxSources: 5,
          temperature: 0.7,
          maxTokens: 1024,
        }
      );

      return NextResponse.json({
        success: true,
        response: response.message,
        sources: response.sources,
        tokensUsed: response.tokensUsed,
      });
    } catch (error) {
      console.error("Error generating chatbot response:", error);
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle streaming response
async function handleStreamingResponse(
  message: string,
  organizationId: string,
  conversationHistory: ChatMessage[]
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const responseStream = chatbotService.generateStreamResponse(
          message,
          organizationId,
          conversationHistory,
          {
            maxSources: 5,
            temperature: 0.7,
            maxTokens: 1024,
          }
        );

        for await (const chunk of responseStream) {
          const data = {
            content: chunk.content,
            isComplete: chunk.isComplete,
            sources: chunk.sources,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );

          if (chunk.isComplete) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        }
      } catch (error) {
        console.error("Error in streaming response:", error);
        const errorData = {
          error: "Failed to generate streaming response",
          isComplete: true,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// GET /api/organizations/[id]/chat - Get chat status and configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user has access to this organization
    const organization = await prisma.organization.findFirst({
      where: {
        id: id,
        users: {
          some: {
            id: user.id,
          },
        },
      },
      include: {
        documents: {
          select: {
            id: true,
            title: true,
            type: true,
            createdAt: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get service status
    const serviceStatus = chatbotService.getStatus();

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        documentCount: organization.documents.length,
      },
      serviceStatus,
      available: serviceStatus.fullyConfigured,
    });
  } catch (error) {
    console.error("Error getting chat status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
