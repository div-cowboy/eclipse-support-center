import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";
import {
  enhancedChatbotService,
  ChatbotConfig,
  ChatMessage,
} from "@/lib/chatbot-service-enhanced";

// POST /api/chatbots/[id]/chat - Chat with a specific chatbot
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
    const {
      message,
      conversationHistory = [],
      stream = false,
      config = {},
      chatId, // Optional chatId for continuing existing chats
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
        id: id,
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

    // Get or create Chat record
    let chat;
    if (chatId) {
      // Find existing chat
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
      });
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
    } else {
      // Create new chat
      chat = await prisma.chat.create({
        data: {
          title: `Chat with ${chatbot.name}`,
          chatbotId: id,
        },
      });
      console.log(`✅ Created new chat: ${chat.id}`);
    }

    // Handle streaming response
    if (stream) {
      return handleStreamingResponse(
        message,
        id,
        conversationHistory,
        config,
        chat.id,
        user.id
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

      // Save user message to database
      await prisma.message.create({
        data: {
          content: message,
          role: "USER",
          chatId: chat.id,
          userId: user.id,
        },
      });

      // Save assistant message to database
      await prisma.message.create({
        data: {
          content: response.message.content,
          role: "AGENT", // AI agent response
          chatId: chat.id,
          userId: null,
          metadata: {
            sources: response.sources,
            tokensUsed: response.tokensUsed,
            escalationRequested: response.message.metadata?.escalationRequested,
            escalationReason: response.message.metadata?.escalationReason,
          },
        },
      });

      console.log(`✅ Saved messages to chat: ${chat.id}`);

      return NextResponse.json({
        success: true,
        response: response.message.content,
        sources: response.sources,
        tokensUsed: response.tokensUsed,
        escalationRequested: response.message.metadata?.escalationRequested,
        escalationReason: response.message.metadata?.escalationReason,
        chatbot: {
          id: chatbot.id,
          name: chatbot.name,
          description: chatbot.description,
        },
        chat: {
          id: chat.id,
        },
        chatId: chat.id, // Return chatId for frontend to use
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
  conversationHistory: ChatMessage[],
  config: Partial<ChatbotConfig>,
  chatId: string,
  userId: string
) {
  const encoder = new TextEncoder();

  // Save user message to database
  await prisma.message.create({
    data: {
      content: message,
      role: "USER",
      chatId: chatId,
      userId: userId,
    },
  });

  let fullResponse = "";
  let responseSources: any[] = [];
  let escalationData: {
    escalationRequested?: boolean;
    escalationReason?: string;
  } = {};

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

        // Send chatId in first chunk
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ chatId })}\n\n`)
        );

        for await (const chunk of responseStream) {
          const data = {
            content: chunk.content,
            isComplete: chunk.isComplete,
            sources: chunk.sources,
            escalationRequested: chunk.escalationRequested,
            escalationReason: chunk.escalationReason,
            chatId: chatId, // Include chatId in every chunk
          };

          // Accumulate response
          if (chunk.content) {
            fullResponse += chunk.content;
          }
          if (chunk.sources) {
            responseSources = chunk.sources;
          }
          if (chunk.escalationRequested !== undefined) {
            escalationData.escalationRequested = chunk.escalationRequested;
            escalationData.escalationReason = chunk.escalationReason;
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );

          if (chunk.isComplete) {
            // Save assistant message to database
            await prisma.message.create({
              data: {
                content: fullResponse,
                role: "AGENT",
                chatId: chatId,
                userId: null,
                metadata: {
                  sources: responseSources,
                  ...escalationData,
                },
              },
            });

            console.log(`✅ Saved streaming messages to chat: ${chatId}`);

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

    // Verify user has access to this chatbot's organization
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: id,
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
