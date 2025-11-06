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
      chatId = null, // Optional chatId to continue existing conversation
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

    // Get or create chat record
    let chat;
    if (chatId) {
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
    } else {
      // Create new chat for this embed conversation
      chat = await prisma.chat.create({
        data: {
          title: `Embed Chat - ${new Date().toLocaleDateString()}`,
          description: `Embedded chat with ${chatbot.name}`,
          chatbotId: chatbot.id,
          status: "ACTIVE",
        },
      });
    }

    // Handle streaming response
    if (stream) {
      return handleStreamingResponse(
        message,
        id,
        conversationHistory,
        config,
        chat.id
      );
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

      // Save user message and assistant response to database
      await prisma.message.createMany({
        data: [
          {
            chatId: chat.id,
            role: "USER",
            content: message,
            userId: null, // Embed chats are anonymous
          },
          {
            chatId: chat.id,
            role: "ASSISTANT",
            content: response.message.content,
            userId: null,
            metadata: {
              sources: response.sources,
              tokensUsed: response.tokensUsed,
              escalationRequested:
                response.message.metadata?.escalationRequested,
              escalationReason: response.message.metadata?.escalationReason,
            },
          },
        ],
      });

      // Update Chat record if escalation was requested
      if (response.message.metadata?.escalationRequested) {
        await prisma.chat.update({
          where: { id: chat.id },
          data: {
            escalationRequested: true,
            escalationReason:
              response.message.metadata.escalationReason ||
              "Customer requested human assistance",
            escalationRequestedAt: new Date(),
          },
        });
        console.log(`🚨 Escalation requested for embed chat: ${chat.id}`);
      }

      return NextResponse.json({
        success: true,
        response: response.message.content,
        sources: response.sources,
        tokensUsed: response.tokensUsed,
        escalationRequested: response.message.metadata?.escalationRequested,
        escalationReason: response.message.metadata?.escalationReason,
        chatId: chat.id, // Return chatId so frontend can track it
        chatbot: {
          id: chatbot.id,
          name: chatbot.name,
          description: chatbot.description,
        },
      });
    } catch (error) {
      console.error("Error generating chatbot response:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Error details:", {
        message: errorMessage,
        stack: errorStack,
        chatbotId: id,
        chatId: chatId || "new",
      });
      return NextResponse.json(
        {
          error: "Failed to generate response",
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in embed chatbot chat endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      chatbotId: id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle streaming response
async function handleStreamingResponse(
  message: string,
  chatbotId: string,
  conversationHistory: ChatMessage[],
  config: Partial<ChatbotConfig>,
  chatId: string
) {
  const encoder = new TextEncoder();
  let fullResponseContent = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseSources: any = [];
  let responseEscalationRequested = false;
  let responseEscalationReason: string | undefined;

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
          // Accumulate the full response
          fullResponseContent += chunk.content;
          if (chunk.sources) {
            responseSources = chunk.sources;
          }
          if (chunk.escalationRequested) {
            responseEscalationRequested = chunk.escalationRequested;
            responseEscalationReason = chunk.escalationReason;
          }

          const data = {
            content: chunk.content,
            isComplete: chunk.isComplete,
            sources: chunk.sources,
            escalationRequested: chunk.escalationRequested,
            escalationReason: chunk.escalationReason,
            chatId: chatId, // Include chatId in streaming response
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );

          if (chunk.isComplete) {
            // Save messages to database after streaming completes
            try {
              await prisma.message.createMany({
                data: [
                  {
                    chatId: chatId,
                    role: "USER",
                    content: message,
                    userId: null,
                  },
                  {
                    chatId: chatId,
                    role: "ASSISTANT",
                    content: fullResponseContent,
                    userId: null,
                    metadata: {
                      sources: responseSources,
                      escalationRequested: responseEscalationRequested,
                      escalationReason: responseEscalationReason,
                    },
                  },
                ],
              });

              // Update Chat record if escalation was requested
              if (responseEscalationRequested) {
                await prisma.chat.update({
                  where: { id: chatId },
                  data: {
                    escalationRequested: true,
                    escalationReason:
                      responseEscalationReason ||
                      "Customer requested human assistance",
                    escalationRequestedAt: new Date(),
                  },
                });
                console.log(
                  `🚨 Escalation requested for embed chat: ${chatId}`
                );
              }
            } catch (dbError) {
              console.error("Error saving messages to database:", dbError);
            }

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
