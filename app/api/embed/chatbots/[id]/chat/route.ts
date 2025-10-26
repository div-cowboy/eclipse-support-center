import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enhancedChatbotService,
  ChatbotConfig,
  ChatMessage,
} from "@/lib/chatbot-service-enhanced";

// POST /api/embed/chatbots/[id]/chat - Chat with a specific chatbot (public for embedding)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return handleStreamingResponse(message, id, conversationHistory, config);
    }

    // Handle regular response
    try {
      // Type-safe config extraction
      const chatbotConfig = chatbot.config as ChatbotConfig | null;
      const response = await enhancedChatbotService.generateChatbotResponse(
        message,
        id,
        conversationHistory,
        {
          name: chatbot.name,
          description: chatbot.description,
          systemPrompt: chatbotConfig?.systemPrompt,
          temperature: chatbotConfig?.temperature,
          maxTokens: chatbotConfig?.maxTokens,
          maxSources: chatbotConfig?.maxSources,
          includeOrganizationDocs: chatbotConfig?.includeOrganizationDocs,
          includeContextBlocks: chatbotConfig?.includeContextBlocks,
          coreRules: chatbotConfig?.coreRules,
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
    console.error("Error in embed chatbot chat endpoint:", error);
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
  conversationHistory: ChatMessage[],
  config: Partial<ChatbotConfig>
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
      "Access-Control-Allow-Origin": "*", // Allow embedding from any domain
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
