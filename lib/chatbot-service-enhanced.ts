// Enhanced Chatbot Service that queries both Organization Documents and Chatbot Context Blocks
// This service combines semantic search with Groq's text generation for a complete chatbot experience

import { grokClient, GrokMessage } from "./grok-client";
import {
  OrganizationDocumentVectorService,
  ContextBlockVectorService,
  OrganizationDescriptionVectorService,
  VectorSearchResult,
} from "./vector-db";
import { initializeVectorDatabase } from "./vector-config";

/**
 * Global rules that are appended to every chatbot's system prompt
 * These ensure consistent behavior across all chatbots
 */
const GLOBAL_CHATBOT_RULES = [
  "• ESCALATION PROTOCOL: ONLY trigger escalation if the user EXPLICITLY requests to speak with a human, real person, agent, or representative. Do NOT escalate for normal customer service questions (returns, exchanges, order status, product questions, etc.) even if the user uses the word 'request'.",
  "• ESCALATION TRIGGERS (user must explicitly say one of these): 'speak to a human', 'talk to a person', 'speak to someone', 'contact a representative', 'talk to an agent', 'speak to a manager', 'I want a human', 'connect me with someone', 'transfer me to a person'",
  "• DO NOT ESCALATE FOR: Questions about returns, exchanges, refunds, order status, shipping, product information, policies, or general customer service questions. These are normal support inquiries that you can handle.",
  "• When escalation IS triggered, you MUST include the exact text [ESCALATION_REQUESTED] at the very end of your response (after all other content). This is a system marker and critical for routing.",
  "• Respond empathetically when escalation is needed: 'I understand you'd like to speak with a human representative. I've noted your request and a customer support button will appear for you to connect with our team. Is there anything else I can help you with in the meantime?'",
  "• Always prioritize user satisfaction and acknowledge when you may not be able to fully address their needs",
  "• Be transparent about your limitations as an AI assistant",
  "• Never pretend to be human or claim capabilities you don't have",
];

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: Array<{
      documentId: string;
      title: string;
      score: number;
      snippet: string;
      type: "organization" | "context";
    }>;
    tokensUsed?: number;
    escalationRequested?: boolean;
    escalationReason?: string;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sources: Array<{
    documentId: string;
    title: string;
    score: number;
    snippet: string;
    type: "organization" | "context";
  }>;
  tokensUsed: number;
}

export interface ChatbotConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  maxSources?: number;
  minScore?: number; // Minimum similarity score threshold (0-1, default 0.35)
  includeOrganizationDocs?: boolean;
  includeContextBlocks?: boolean;
  coreRules?: {
    alwaysEndWithQuestion?: boolean;
    maintainConversationalTone?: boolean;
    identifyAsChatbot?: boolean;
    customRules?: string[];
  };
}

export class EnhancedChatbotService {
  private organizationVectorService: OrganizationDocumentVectorService | null =
    null;
  private contextBlockVectorService: ContextBlockVectorService | null = null;
  private organizationDescriptionVectorService: OrganizationDescriptionVectorService | null =
    null;

  constructor() {
    // Initialize vector services asynchronously
    this.initializeVectorServices().catch((error) => {
      console.error("Failed to initialize vector services:", error);
    });
  }

  /**
   * Detect if escalation was requested in the response
   * Returns the cleaned content and escalation status
   */
  private detectEscalation(content: string): {
    cleanContent: string;
    escalationRequested: boolean;
    escalationReason?: string;
  } {
    const escalationMarker = "[ESCALATION_REQUESTED]";
    const hasEscalation = content.includes(escalationMarker);

    if (hasEscalation) {
      // Remove the marker from the content
      const cleanContent = content.replace(escalationMarker, "").trim();
      return {
        cleanContent,
        escalationRequested: true,
        escalationReason: "User requested human assistance",
      };
    }

    return {
      cleanContent: content,
      escalationRequested: false,
    };
  }

  private async initializeVectorServices() {
    try {
      const vectorDB = await initializeVectorDatabase();
      if (vectorDB) {
        this.organizationVectorService = new OrganizationDocumentVectorService(
          vectorDB
        );
        this.contextBlockVectorService = new ContextBlockVectorService(
          vectorDB
        );
        this.organizationDescriptionVectorService =
          new OrganizationDescriptionVectorService(vectorDB);
        console.log("Vector services initialized successfully");
      } else {
        console.warn("Vector database not available");
      }
    } catch (error) {
      console.error("Failed to initialize vector services:", error);
    }
  }

  /**
   * Generate a response for a specific chatbot using both organization and context documents
   */
  async generateChatbotResponse(
    userMessage: string,
    chatbotId: string,
    conversationHistory: ChatMessage[] = [],
    config: Partial<ChatbotConfig> = {}
  ): Promise<ChatResponse> {
    const defaultConfig: ChatbotConfig = {
      name: "Assistant",
      systemPrompt:
        "You are a helpful AI assistant. Use the provided context to answer questions accurately and helpfully.",
      temperature: 0.7,
      maxTokens: 1024,
      maxSources: 8,
      minScore: 0.35, // Filter out low-relevance results (below 35% similarity)
      includeOrganizationDocs: true,
      includeContextBlocks: true,
      coreRules: {
        alwaysEndWithQuestion: true,
        maintainConversationalTone: true,
        identifyAsChatbot: true,
        customRules: [
          "Always maintain a helpful and professional tone",
          "If you don't know something, say so clearly",
          "Keep responses concise but comprehensive",
        ],
      },
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      // Get chatbot and organization info
      const { prisma } = await import("./prisma");
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        include: {
          organization: true,
          contextBlocks: {
            select: {
              id: true,
              title: true,
              content: true,
              type: true,
            },
          },
        },
      });

      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Step 1: Search for relevant documents from both sources
      const relevantDocs = await this.searchAllRelevantDocuments(
        userMessage,
        chatbot.organizationId,
        chatbotId,
        finalConfig.maxSources!,
        finalConfig.minScore!,
        finalConfig.includeOrganizationDocs!,
        finalConfig.includeContextBlocks!
      );

      // Step 2: Build context from search results
      const context = this.buildContextFromDocuments(
        relevantDocs,
        chatbot.name
      );

      // Step 3: Create system prompt for Groq
      const systemPrompt = this.createChatbotSystemPrompt(
        context,
        chatbot.name,
        finalConfig.systemPrompt!,
        finalConfig.coreRules
      );

      // Step 4: Build conversation history for Groq
      const grokMessages = this.buildGrokMessages(
        userMessage,
        systemPrompt,
        conversationHistory
      );

      // Step 5: Generate response with Groq
      const grokResponse = await grokClient.chat(grokMessages, {
        temperature: finalConfig.temperature,
        maxCompletionTokens: finalConfig.maxTokens,
      });

      // Step 6: Detect escalation in response
      const escalationDetection = this.detectEscalation(grokResponse.content);

      // Step 7: Create response message
      const responseMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: escalationDetection.cleanContent,
        timestamp: new Date(),
        metadata: {
          sources: relevantDocs.map((doc) => ({
            documentId: doc.document?.id || "",
            title: doc.document?.title || "",
            score: doc.score,
            snippet: this.extractSnippet(
              doc.document?.content || "",
              userMessage
            ),
            type: doc.type as "organization" | "context",
          })),
          tokensUsed: grokResponse.usage?.totalTokens || 0,
          escalationRequested: escalationDetection.escalationRequested,
          escalationReason: escalationDetection.escalationReason,
        },
      };

      return {
        message: responseMessage,
        sources: responseMessage.metadata?.sources || [],
        tokensUsed: grokResponse.usage?.totalTokens || 0,
      };
    } catch (error) {
      console.error("Error generating chatbot response:", error);
      throw new Error(
        `Failed to generate response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate a streaming response for a specific chatbot
   */
  async *generateChatbotStreamResponse(
    userMessage: string,
    chatbotId: string,
    conversationHistory: ChatMessage[] = [],
    config: Partial<ChatbotConfig> = {}
  ): AsyncGenerator<
    {
      content: string;
      isComplete: boolean;
      sources?: VectorSearchResult[];
      escalationRequested?: boolean;
      escalationReason?: string;
    },
    void,
    unknown
  > {
    const defaultConfig: ChatbotConfig = {
      name: "Assistant",
      systemPrompt:
        "You are a helpful AI assistant. Use the provided context to answer questions accurately and helpfully.",
      temperature: 0.7,
      maxTokens: 1024,
      maxSources: 8,
      minScore: 0.35, // Filter out low-relevance results (below 35% similarity)
      includeOrganizationDocs: true,
      includeContextBlocks: true,
      coreRules: {
        alwaysEndWithQuestion: true,
        maintainConversationalTone: true,
        identifyAsChatbot: true,
        customRules: [
          "Always maintain a helpful and professional tone",
          "If you don't know something, say so clearly",
          "Keep responses concise but comprehensive",
        ],
      },
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      // Get chatbot and organization info
      const { prisma } = await import("./prisma");
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        include: {
          organization: true,
          contextBlocks: {
            select: {
              id: true,
              title: true,
              content: true,
              type: true,
            },
          },
        },
      });

      if (!chatbot) {
        throw new Error("Chatbot not found");
      }

      // Step 1: Search for relevant documents from both sources
      const relevantDocs = await this.searchAllRelevantDocuments(
        userMessage,
        chatbot.organizationId,
        chatbotId,
        finalConfig.maxSources!,
        finalConfig.minScore!,
        finalConfig.includeOrganizationDocs!,
        finalConfig.includeContextBlocks!
      );

      // Step 2: Build context from search results
      const context = this.buildContextFromDocuments(
        relevantDocs,
        chatbot.name
      );

      // Step 3: Create system prompt for Groq
      const systemPrompt = this.createChatbotSystemPrompt(
        context,
        chatbot.name,
        finalConfig.systemPrompt!,
        finalConfig.coreRules
      );

      // Step 4: Build conversation history for Groq
      const grokMessages = this.buildGrokMessages(
        userMessage,
        systemPrompt,
        conversationHistory
      );

      // Step 5: Stream response with Groq
      let accumulatedContent = "";
      for await (const chunk of grokClient.chatStream(grokMessages, {
        temperature: finalConfig.temperature,
        maxCompletionTokens: finalConfig.maxTokens,
      })) {
        accumulatedContent += chunk.content;

        // On the final chunk, detect escalation and send metadata only (no content to avoid duplication)
        if (chunk.isComplete) {
          const escalationDetection = this.detectEscalation(accumulatedContent);
          yield {
            content: "", // Empty string - all content already streamed
            isComplete: true,
            sources: relevantDocs,
            escalationRequested: escalationDetection.escalationRequested,
            escalationReason: escalationDetection.escalationReason,
          };
        } else {
          yield {
            content: chunk.content,
            isComplete: false,
          };
        }
      }
    } catch (error) {
      console.error("Error generating streaming response:", error);
      throw new Error(
        `Failed to generate streaming response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Search for relevant documents from organization descriptions, organization documents, and context sources
   */
  private async searchAllRelevantDocuments(
    query: string,
    organizationId: string,
    chatbotId: string,
    maxResults: number,
    minScore: number,
    includeOrganizationDocs: boolean,
    includeContextBlocks: boolean
  ): Promise<
    Array<{
      id: string;
      score: number;
      document?: {
        id: string;
        title: string;
        content: string;
        type: string;
      };
      type: "organization_description" | "organization" | "context";
      metadata: VectorSearchResult["metadata"];
    }>
  > {
    const allResults: Array<{
      id: string;
      score: number;
      document?: {
        id: string;
        title: string;
        content: string;
        type: string;
      };
      type: "organization_description" | "organization" | "context";
      metadata: VectorSearchResult["metadata"];
    }> = [];

    try {
      // Search organization descriptions first (highest priority)
      if (this.organizationDescriptionVectorService) {
        const orgDescResults = await this.searchOrganizationDescriptions(
          query,
          organizationId,
          Math.ceil(maxResults / 3)
        );
        allResults.push(...orgDescResults);
      }

      // Search organization documents
      if (includeOrganizationDocs && this.organizationVectorService) {
        const orgResults = await this.searchOrganizationDocuments(
          query,
          organizationId,
          Math.ceil(maxResults / 3)
        );
        allResults.push(...orgResults);
      }

      // Search context blocks
      if (includeContextBlocks && this.contextBlockVectorService) {
        const contextResults = await this.searchContextBlocks(
          query,
          chatbotId,
          Math.ceil(maxResults / 3)
        );
        allResults.push(...contextResults);
      }

      // Filter by minimum score threshold (removes low-relevance results)
      const qualifyingResults = allResults.filter(
        (result) => result.score >= minScore
      );

      // Log filtering stats for debugging
      if (allResults.length > qualifyingResults.length) {
        console.log(
          `Filtered out ${
            allResults.length - qualifyingResults.length
          } low-relevance results (below ${minScore} threshold)`
        );
      }

      // Sort by score and limit results
      return qualifyingResults
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
    } catch (error) {
      console.error("Error searching documents:", error);
      return [];
    }
  }

  /**
   * Search organization descriptions
   */
  private async searchOrganizationDescriptions(
    query: string,
    organizationId: string,
    maxResults: number
  ): Promise<
    Array<{
      id: string;
      score: number;
      document?: {
        id: string;
        title: string;
        content: string;
        type: string;
      };
      type: "organization_description";
      metadata: VectorSearchResult["metadata"];
    }>
  > {
    if (!this.organizationDescriptionVectorService) {
      return [];
    }

    try {
      const searchResults =
        await this.organizationDescriptionVectorService.searchOrganizationDescriptions(
          query,
          organizationId,
          maxResults
        );

      // Use the search results directly since they already contain the organization description
      return searchResults.map((result) => ({
        id: result.id,
        score: result.score,
        document: {
          id: result.metadata.contextBlockId, // This is the organizationId
          title: result.metadata.title,
          content: result.metadata.content,
          type: result.metadata.type,
        },
        type: "organization_description" as const,
        metadata: result.metadata,
      }));
    } catch (error) {
      console.error("Error searching organization descriptions:", error);
      return [];
    }
  }

  /**
   * Search organization documents
   */
  private async searchOrganizationDocuments(
    query: string,
    organizationId: string,
    maxResults: number
  ): Promise<
    Array<{
      id: string;
      score: number;
      document?: {
        id: string;
        title: string;
        content: string;
        type: string;
      };
      type: "organization";
      metadata: VectorSearchResult["metadata"];
    }>
  > {
    if (!this.organizationVectorService) {
      return [];
    }

    try {
      const searchResults =
        await this.organizationVectorService.searchOrganizationDocuments(
          query,
          organizationId,
          maxResults
        );

      // Get full document details
      const { prisma } = await import("./prisma");
      const documentIds = searchResults.map(
        (result) => result.metadata.contextBlockId
      );

      const documents = await prisma.organizationDocument.findMany({
        where: {
          id: { in: documentIds },
          organizationId,
        },
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
        },
      });

      // Combine search results with document details
      return searchResults
        .map((result) => {
          const document = documents.find(
            (doc) => doc.id === result.metadata.contextBlockId
          );
          return {
            id: result.id,
            score: result.score,
            document: document || undefined,
            type: "organization" as const,
            metadata: result.metadata,
          };
        })
        .filter((result) => result.document !== undefined);
    } catch (error) {
      console.error("Error searching organization documents:", error);
      return [];
    }
  }

  /**
   * Search context blocks
   */
  private async searchContextBlocks(
    query: string,
    chatbotId: string,
    maxResults: number
  ): Promise<
    Array<{
      id: string;
      score: number;
      document?: {
        id: string;
        title: string;
        content: string;
        type: string;
      };
      type: "context";
      metadata: VectorSearchResult["metadata"];
    }>
  > {
    if (!this.contextBlockVectorService) {
      return [];
    }

    try {
      const searchResults =
        await this.contextBlockVectorService.searchContextBlocks(
          query,
          chatbotId,
          maxResults
        );

      // Get full context block details
      const { prisma } = await import("./prisma");
      const contextBlockIds = searchResults.map(
        (result) => result.metadata.contextBlockId
      );

      const contextBlocks = await prisma.contextBlock.findMany({
        where: {
          id: { in: contextBlockIds },
          chatbotId,
        },
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
        },
      });

      // Combine search results with context block details
      return searchResults
        .map((result) => {
          const contextBlock = contextBlocks.find(
            (block) => block.id === result.metadata.contextBlockId
          );
          return {
            id: result.id,
            score: result.score,
            document: contextBlock || undefined,
            type: "context" as const,
            metadata: result.metadata,
          };
        })
        .filter((result) => result.document !== undefined);
    } catch (error) {
      console.error("Error searching context blocks:", error);
      return [];
    }
  }

  /**
   * Build context string from relevant documents
   */
  private buildContextFromDocuments(
    documents: Array<{
      document?: { id: string; title: string; content: string; type: string };
      score: number;
      type: "organization_description" | "organization" | "context";
    }>,
    chatbotName: string
  ): string {
    if (documents.length === 0) {
      return `No relevant documents found in the knowledge base for ${chatbotName}.`;
    }

    const contextParts = documents.map((doc) => {
      if (!doc.document) return "";

      // Don't expose internal metadata - just provide the content
      return `${doc.document.title}:
${doc.document.content.substring(0, 1000)}${
        doc.document.content.length > 1000 ? "..." : ""
      }

---`;
    });

    return contextParts.join("\n");
  }

  /**
   * Create system prompt for chatbot
   */
  private createChatbotSystemPrompt(
    context: string,
    chatbotName: string,
    basePrompt: string,
    coreRules?: ChatbotConfig["coreRules"]
  ): string {
    // Build core conversation rules
    const conversationRules = this.buildConversationRules(coreRules);

    return `${basePrompt}

You are ${chatbotName}, a customer support representative. You represent the organization and should speak in first-person (using "we", "our", "us") when discussing company policies, products, or services.

CORE CONVERSATION RULES:
${conversationRules}

IMPORTANT INSTRUCTIONS:
1. Speak as a representative of the organization - use "we", "our", and "us" (not "the company" or third-person references)
2. Keep responses CONCISE - aim for 3-4 sentences maximum unless more detail is specifically requested
3. Use ONLY the information provided in the context below to answer questions
4. If the context doesn't contain enough information, clearly state that and offer to help with something else
5. Be direct and helpful - get to the point quickly
6. If asked about something not in the knowledge base, briefly explain that you don't have that information
7. Always be professional and friendly

CONTEXT FROM KNOWLEDGE BASE:
${context}

Remember: Speak AS the organization (first-person), keep responses brief, and only use information from the provided context.`;
  }

  /**
   * Build conversation rules from core rules configuration
   */
  private buildConversationRules(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _coreRules?: ChatbotConfig["coreRules"]
  ): string {
    // Chatbot-specific rules
    const staticRules = [
      "• You are an AI chatbot designed to help users with their questions",
      "• Maintain a conversational, helpful, and professional tone",
      "• Always end your responses with a relevant question or confirmation to keep the conversation flowing",
      "• Always maintain a helpful and professional tone",
      "• If you don't know something, say so clearly",
      "• Keep responses concise but comprehensive",
      "• Use Eclipse-specific terminology when relevant",
      "• Ask clarifying questions if the user's request is ambiguous",
    ];

    // Combine global rules (always applied first) with chatbot-specific rules
    const allRules = [...GLOBAL_CHATBOT_RULES, ...staticRules];
    return allRules.join("\n");

    // Original dynamic rules code (commented out for static testing)
    /*
    if (!coreRules) {
      return "• Maintain a helpful and professional tone\n• Always be honest about what you know and don't know";
    }

    const rules: string[] = [];

    if (coreRules.identifyAsChatbot) {
      rules.push(
        "• You are an AI chatbot designed to help users with their questions"
      );
    }

    if (coreRules.maintainConversationalTone) {
      rules.push("• Maintain a conversational, helpful, and professional tone");
    }

    if (coreRules.alwaysEndWithQuestion) {
      rules.push(
        "• Always end your responses with a relevant question or confirmation to keep the conversation flowing"
      );
    }

    if (coreRules.customRules && coreRules.customRules.length > 0) {
      rules.push(...coreRules.customRules.map((rule) => `• ${rule}`));
    }

    // Default rules if none specified
    if (rules.length === 0) {
      rules.push("• Maintain a helpful and professional tone");
      rules.push("• Always be honest about what you know and don't know");
    }

    return rules.join("\n");
    */
  }

  /**
   * Build messages for Groq API
   */
  private buildGrokMessages(
    userMessage: string,
    systemPrompt: string,
    conversationHistory: ChatMessage[]
  ): GrokMessage[] {
    const messages: GrokMessage[] = [{ role: "system", content: systemPrompt }];

    // Add recent conversation history (last 10 messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    return messages;
  }

  /**
   * Extract a relevant snippet from document content
   */
  private extractSnippet(content: string, query: string): string {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);

    // Find sentence with most query word matches
    let bestSentence = "";
    let maxMatches = 0;

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const matches = queryWords.filter((word) =>
        sentenceLower.includes(word)
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = sentence.trim();
      }
    }

    // Return best sentence or first 200 characters
    return (
      bestSentence ||
      content.substring(0, 200) + (content.length > 200 ? "..." : "")
    );
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return (
      grokClient.isConfigured() &&
      this.organizationVectorService !== null &&
      this.contextBlockVectorService !== null &&
      this.organizationDescriptionVectorService !== null
    );
  }

  /**
   * Wait for vector services to be initialized
   */
  async waitForInitialization(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.isConfigured()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Get service status
   */
  getStatus(): {
    groqConfigured: boolean;
    organizationVectorServiceAvailable: boolean;
    contextBlockVectorServiceAvailable: boolean;
    organizationDescriptionVectorServiceAvailable: boolean;
    fullyConfigured: boolean;
  } {
    return {
      groqConfigured: grokClient.isConfigured(),
      organizationVectorServiceAvailable:
        this.organizationVectorService !== null,
      contextBlockVectorServiceAvailable:
        this.contextBlockVectorService !== null,
      organizationDescriptionVectorServiceAvailable:
        this.organizationDescriptionVectorService !== null,
      fullyConfigured: this.isConfigured(),
    };
  }
}

// Create a default instance
export const enhancedChatbotService = new EnhancedChatbotService();
