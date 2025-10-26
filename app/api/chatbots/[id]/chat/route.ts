import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import { enhancedChatbotService } from "@/lib/chatbot-service-enhanced";

// POST /api/chatbots/[id]/chat - Chat with a specific chatbot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      stream = false,
      config = {},
    } = body;

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

    // Verify user has access to this chatbot's organization
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: params.id,
        organization: {
          users: {
            some: {
              id: user.id,
            },
          },
        },
      },
      include: {
        organization: true,
        contextBlocks: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Check if enhanced chatbot service is configured
    const serviceStatus = enhancedChatbotService.getStatus();
    if (!serviceStatus.fullyConfigured) {
      return NextResponse.json(
        {
          error: "Chatbot service not fully configured",
          details: {
            groqConfigured: serviceStatus.groqConfigured,
            organizationVectorServiceAvailable:
              serviceStatus.organizationVectorServiceAvailable,
            contextBlockVectorServiceAvailable:
              serviceStatus.contextBlockVectorServiceAvailable,
          },
        },
        { status: 503 }
      );
    }

    // Handle streaming response
    if (stream) {
      return handleStreamingResponse(
        message,
        params.id,
        conversationHistory,
        config,
        request
      );
    }

    // Handle regular response
    try {
      const response = await enhancedChatbotService.generateChatbotResponse(
        message,
        params.id,
        conversationHistory,
        {
          name: chatbot.name,
          description: chatbot.description,
          systemPrompt: chatbot.config?.systemPrompt as string,
          temperature: chatbot.config?.temperature as number,
          maxTokens: chatbot.config?.maxTokens as number,
          maxSources: chatbot.config?.maxSources as number,
          includeOrganizationDocs: chatbot.config
            ?.includeOrganizationDocs as boolean,
          includeContextBlocks: chatbot.config?.includeContextBlocks as boolean,
          coreRules: chatbot.config?.coreRules as any,
          ...config, // Override with any provided config
        }
      );

      return NextResponse.json({
        success: true,
        response: response.message.content,
        sources: response.sources,
        tokensUsed: response.tokensUsed,
        chatbot: {
          id: chatbot.id,
          name: chatbot.name,
          description: chatbot.description,
        },
      });
    } catch (error) {
      console.error("Error generating chatbot response:", error);
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in chatbot chat endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle streaming response
async function handleStreamingResponse(
  message: string,
  chatbotId: string,
  conversationHistory: any[],
  config: any,
  request: NextRequest
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const responseStream =
          enhancedChatbotService.generateChatbotStreamResponse(
            message,
            chatbotId,
            conversationHistory,
            config
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

// GET /api/chatbots/[id]/chat - Get chatbot status and configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Verify user has access to this chatbot's organization
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: params.id,
        organization: {
          users: {
            some: {
              id: user.id,
            },
          },
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            documents: {
              select: {
                id: true,
                title: true,
                type: true,
                createdAt: true,
              },
            },
          },
        },
        contextBlocks: {
          select: {
            id: true,
            title: true,
            type: true,
            createdAt: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Get service status
    const serviceStatus = enhancedChatbotService.getStatus();

    return NextResponse.json({
      chatbot: {
        id: chatbot.id,
        name: chatbot.name,
        description: chatbot.description,
        status: chatbot.status,
        config: chatbot.config,
        organization: chatbot.organization,
        contextBlockCount: chatbot.contextBlocks.length,
        organizationDocumentCount: chatbot.organization.documents.length,
      },
      serviceStatus,
      available: serviceStatus.fullyConfigured,
    });
  } catch (error) {
    console.error("Error getting chatbot status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
