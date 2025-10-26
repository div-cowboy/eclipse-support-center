// Enhanced Chatbot Service that queries both Organization Documents and Chatbot Context Blocks
// This service combines semantic search with Groq's text generation for a complete chatbot experience

import { grokClient, GrokMessage } from "./grok-client";
import {
  OrganizationDocumentVectorService,
  ContextBlockVectorService,
  OrganizationDescriptionVectorService,
  VectorSearchResult,
} from "./vector-db";
import { VectorDatabase } from "./vector-db";
import { initializeVectorDatabase } from "./vector-config";

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

      // Step 6: Create response message
      const responseMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: grokResponse.content,
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
    { content: string; isComplete: boolean; sources?: VectorSearchResult[] },
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
      for await (const chunk of grokClient.chatStream(grokMessages, {
        temperature: finalConfig.temperature,
        maxCompletionTokens: finalConfig.maxTokens,
      })) {
        yield {
          content: chunk.content,
          isComplete: chunk.isComplete,
          sources: chunk.isComplete ? relevantDocs : undefined,
        };
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

      // Sort by score and limit results
      return allResults.sort((a, b) => b.score - a.score).slice(0, maxResults);
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

    const contextParts = documents.map((doc, index) => {
      if (!doc.document) return "";

      let sourceType: string;
      switch (doc.type) {
        case "organization_description":
          sourceType = "Organization Information";
          break;
        case "organization":
          sourceType = "Organization Document";
          break;
        case "context":
          sourceType = "Chatbot Context";
          break;
        default:
          sourceType = "Unknown Source";
      }

      return `${sourceType} ${index + 1} (Relevance: ${(
        doc.score * 100
      ).toFixed(1)}%):
Title: ${doc.document.title}
Type: ${doc.document.type}
Content: ${doc.document.content.substring(0, 1000)}${
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

You are ${chatbotName}, a specialized AI assistant. You have access to both organization-wide documents and chatbot-specific context to help answer questions.

CORE CONVERSATION RULES:
${conversationRules}

IMPORTANT INSTRUCTIONS:
1. Use ONLY the information provided in the context below to answer questions
2. If the context doesn't contain enough information to answer a question, clearly state that
3. Be specific and cite relevant parts of the documents when possible
4. If asked about something not in the knowledge base, politely explain that you don't have that information
5. Keep responses concise but comprehensive
6. Always be helpful and professional
7. When citing sources, mention whether it's from organization documents or chatbot context

CONTEXT FROM KNOWLEDGE BASE:
${context}

Remember: Only use information from the provided context. If you cannot answer based on the context, say so clearly.`;
  }

  /**
   * Build conversation rules from core rules configuration
   */
  private buildConversationRules(
    coreRules?: ChatbotConfig["coreRules"]
  ): string {
    // Static rules for quick testing - you can modify these directly
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

    return staticRules.join("\n");

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
