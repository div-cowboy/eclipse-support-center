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
  console.log("=".repeat(80));
  console.log("[API] 📧 POST /api/embed/chatbots/[id]/chat - REQUEST RECEIVED");
  console.log("=".repeat(80));
  try {
    // Validate DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not configured");
      return NextResponse.json(
        {
          error: "Database configuration error",
          details:
            process.env.NODE_ENV === "development"
              ? "DATABASE_URL environment variable is missing"
              : undefined,
        },
        { status: 500 }
      );
    }

    // Check if DATABASE_URL has invalid format
    const dbUrl = process.env.DATABASE_URL;
    if (
      !dbUrl.startsWith("postgresql://") &&
      !dbUrl.startsWith("postgres://") &&
      !dbUrl.startsWith("prisma://") &&
      !dbUrl.startsWith("prisma+postgres://")
    ) {
      console.error("Invalid DATABASE_URL format:", {
        urlPrefix: dbUrl.substring(0, 20) + "...",
        hasUrl: !!dbUrl,
      });
      return NextResponse.json(
        {
          error: "Database configuration error",
          details:
            process.env.NODE_ENV === "development"
              ? `DATABASE_URL must start with postgresql://, postgres://, prisma://, or prisma+postgres://`
              : undefined,
        },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      stream = false,
      config = {},
      chatId: rawChatId, // Optional chatId to continue existing conversation
      skipUserMessage = false, // Flag to skip creating user message (prevents duplicates when resuming after email)
    } = body;

    // Normalize undefined to null for chatId
    const chatId = rawChatId || null;

    console.log("[API] 📧 REQUEST BODY PARSED:", {
      chatbotId: id,
      message: message?.substring(0, 50),
      stream,
      chatId,
      hasConfig: !!config,
      config: config,
      autoSendFirstMessage: config?.autoSendFirstMessage,
    });

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

    // Extract chatbot config
    const chatbotConfig = chatbot.config as {
      chatStartType?: "AI_ASSISTANT" | "HUMAN" | "CATEGORY_SELECT";
      customerEmailRequired?: boolean;
      staticMessage?: string;
      categorySubjects?: string[];
    } | null;

    // Get or create chat record
    // Note: Auto-sent first message is now created when chat opens, not when user sends first message
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
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      // Note: Auto-sent first message is now created when chat opens, not when user sends first message
    }

    // Ensure chat is not null (should never happen, but TypeScript needs this)
    if (!chat) {
      return NextResponse.json(
        { error: "Failed to create or retrieve chat" },
        { status: 500 }
      );
    }

    // Check if email is required and has been collected
    const customerEmailRequired =
      chatbotConfig?.customerEmailRequired !== undefined
        ? chatbotConfig.customerEmailRequired
        : true;
    const chatMetadata =
      ((chat as { metadata?: unknown }).metadata as Record<string, unknown>) ||
      {};
    const hasEmail = !!chatMetadata.customerEmail;

    console.log("[API] 📧 CHAT METADATA CHECK:", {
      customerEmailRequired,
      hasEmail,
      chatMetadata,
      chatId: chat.id,
    });

    // Handle category selection for CATEGORY_SELECT start type
    if (
      chatbotConfig?.chatStartType === "CATEGORY_SELECT" &&
      chatbotConfig.categorySubjects &&
      chatbotConfig.categorySubjects.length > 0
    ) {
      // Check if message matches a category
      const selectedCategory = chatbotConfig.categorySubjects.find(
        (category) =>
          message.toLowerCase().trim() === category.toLowerCase().trim() ||
          message.toLowerCase().includes(category.toLowerCase())
      );

      if (selectedCategory) {
        // User selected a category
        const categoryResponse = `We'd be happy to help you with ${selectedCategory}.`;

        // Save category selection message
        await prisma.message.create({
          data: {
            chatId: chat.id,
            role: "USER",
            content: message,
            userId: null,
            metadata: {
              categorySelected: selectedCategory,
            },
          },
        });

        // Save category response message (always save it, regardless of email requirement)
        const categoryResponseMessage = await prisma.message.create({
          data: {
            chatId: chat.id,
            role: "ASSISTANT",
            content: categoryResponse,
            userId: null,
          },
        });

        // If email is required and not collected, ask for email
        if (customerEmailRequired && !hasEmail) {
          const emailPromptMessage = await prisma.message.create({
            data: {
              chatId: chat.id,
              role: "ASSISTANT",
              content:
                "In case we get disconnected, what's your business email address?",
              userId: null,
            },
          });

          return NextResponse.json({
            success: true,
            response: categoryResponse,
            responseMessageId: categoryResponseMessage.id, // Include the category response message ID
            chatId: chat.id,
            requiresEmail: true,
            emailPromptMessageId: emailPromptMessage.id,
            chatbot: {
              id: chatbot.id,
              name: chatbot.name,
              description: chatbot.description,
            },
          });
        }

        // Email already collected or not required, continue normally

        return NextResponse.json({
          success: true,
          response: categoryResponse,
          chatId: chat.id,
          chatbot: {
            id: chatbot.id,
            name: chatbot.name,
            description: chatbot.description,
          },
        });
      }
    }

    // Check if email is required but not collected for AI_ASSISTANT/HUMAN flows
    console.log("[API] 📧 EMAIL REQUIREMENT CHECK:", {
      customerEmailRequired,
      hasEmail,
      chatStartType: chatbotConfig?.chatStartType,
      isAI_ASSISTANT: chatbotConfig?.chatStartType === "AI_ASSISTANT",
      isHUMAN: chatbotConfig?.chatStartType === "HUMAN",
      userMessagesCount:
        chat.messages?.filter((msg) => msg.role === "USER").length || 0,
      allMessagesCount: chat.messages?.length || 0,
    });

    if (
      customerEmailRequired &&
      !hasEmail &&
      (chatbotConfig?.chatStartType === "AI_ASSISTANT" ||
        chatbotConfig?.chatStartType === "HUMAN")
    ) {
      // Count user messages to determine flow stage
      const userMessages =
        chat.messages?.filter((msg) => msg.role === "USER") || [];

      console.log("[API] 📧 FIRST USER MESSAGE CHECK:", {
        userMessagesCount: userMessages.length,
        isFirstMessage: userMessages.length === 0,
        willReturnJSON: userMessages.length === 0,
      });

      // If this is the first user message, we need to confirm help first
      if (userMessages.length === 0) {
        console.log(
          "[API] 📧 PROCESSING FIRST USER MESSAGE - Email required, returning JSON (not streaming)"
        );
        // This is the first user reply after static message
        // Save user message only if skipUserMessage is false (prevents duplicates when resuming after email)
        if (!skipUserMessage) {
          await prisma.message.create({
            data: {
              chatId: chat.id,
              role: "USER",
              content: message,
              userId: null,
            },
          });
        } else {
          console.log(
            "[API] 📧 Skipping user message creation (skipUserMessage=true) - message already exists"
          );
        }

        // Send a short, concise confirmation message (not a full AI response)
        const confirmationMessage = "Absolutely! I'd be happy to help.";

        // Save short confirmation response
        const aiResponseMessage = await prisma.message.create({
          data: {
            chatId: chat.id,
            role: "ASSISTANT",
            content: confirmationMessage,
            userId: null,
          },
        });

        // Now ask for email
        const emailPromptMessage = await prisma.message.create({
          data: {
            chatId: chat.id,
            role: "ASSISTANT",
            content:
              "In case we get disconnected, what's your business email address?",
            userId: null,
          },
        });

        return NextResponse.json({
          success: true,
          response: confirmationMessage,
          responseMessageId: aiResponseMessage.id, // Include the confirmation message ID
          chatId: chat.id,
          requiresEmail: true,
          emailPromptMessageId: emailPromptMessage.id,
          chatbot: {
            id: chatbot.id,
            name: chatbot.name,
            description: chatbot.description,
          },
        });
      }
    }

    // Handle streaming response
    console.log("[API] 📧 STREAMING CHECK:", {
      stream,
      willUseStreaming: stream,
      customerEmailRequired,
      hasEmail,
      chatStartType: chatbotConfig?.chatStartType,
    });

    if (stream) {
      // NOTE: If email is required and not collected, we should NOT use streaming
      // The email requirement check above should have returned early with JSON
      // But if we reach here, it means either:
      // 1. Email is not required
      // 2. Email is already collected
      // 3. This is not the first user message
      console.log(
        "[API] 📧 USING STREAMING MODE (email check bypassed or not applicable)"
      );
      return handleStreamingResponse(
        message,
        id,
        conversationHistory,
        config,
        chat.id,
        skipUserMessage
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

      // Check if user message already exists (e.g., from email form flow)
      // This prevents duplicates when resuming chat after email submission
      const existingUserMessage = chat.messages?.find(
        (msg) => msg.role === "USER" && msg.content === message
      );

      // Only save user message if it doesn't already exist AND skipUserMessage is false
      const messagesToCreate =
        existingUserMessage || skipUserMessage
          ? [
              {
                chatId: chat.id,
                role: "ASSISTANT" as const,
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
            ]
          : [
              {
                chatId: chat.id,
                role: "USER" as const,
                content: message,
                userId: null, // Embed chats are anonymous
              },
              {
                chatId: chat.id,
                role: "ASSISTANT" as const,
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
            ];

      // Save messages to database
      await prisma.message.createMany({
        data: messagesToCreate,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in embed chatbot chat endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Check for Prisma connection errors
    const isPrismaConnectionError =
      errorMessage.includes("prisma://") ||
      errorMessage.includes("prisma+postgres://") ||
      errorMessage.includes("datasource") ||
      errorMessage.includes("URL must start");

    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      isPrismaConnectionError,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 30) + "..."
        : "MISSING",
    });

    // Provide more helpful error for database connection issues
    if (isPrismaConnectionError) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details:
            process.env.NODE_ENV === "development"
              ? `Database connection error: ${errorMessage}. Check that DATABASE_URL is set correctly in Vercel environment variables.`
              : "Database connection error. Please check server logs.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
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
  chatId: string,
  skipUserMessage = false
) {
  const encoder = new TextEncoder();
  let fullResponseContent = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseSources: any = [];
  let responseEscalationRequested = false;
  let responseEscalationReason: string | undefined;
  let isFirstChunk = true;

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
              // Check if user message already exists (prevents duplicates when resuming after email)
              const chat = await prisma.chat.findUnique({
                where: { id: chatId },
                include: { messages: true },
              });

              const existingUserMessage = chat?.messages?.find(
                (msg) => msg.role === "USER" && msg.content === message
              );

              // Only save user message if it doesn't already exist AND skipUserMessage is false
              const messagesToCreate =
                existingUserMessage || skipUserMessage
                  ? [
                      {
                        chatId: chatId,
                        role: "ASSISTANT" as const,
                        content: fullResponseContent,
                        userId: null,
                        metadata: {
                          sources: responseSources,
                          escalationRequested: responseEscalationRequested,
                          escalationReason: responseEscalationReason,
                        },
                      },
                    ]
                  : [
                      {
                        chatId: chatId,
                        role: "USER" as const,
                        content: message,
                        userId: null,
                      },
                      {
                        chatId: chatId,
                        role: "ASSISTANT" as const,
                        content: fullResponseContent,
                        userId: null,
                        metadata: {
                          sources: responseSources,
                          escalationRequested: responseEscalationRequested,
                          escalationReason: responseEscalationReason,
                        },
                      },
                    ];

              await prisma.message.createMany({
                data: messagesToCreate,
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
