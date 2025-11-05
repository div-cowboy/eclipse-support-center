// Chatbot Service using Groq for LLM and Pinecone for vector search
// This service combines semantic search with Groq's text generation

import { grokClient, GrokMessage } from "./grok-client";
import {
  OrganizationDocumentVectorService,
  VectorSearchResult,
} from "./vector-db";
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
    }>;
    tokensUsed?: number;
  };
}

export interface ChatSession {
  id: string;
  organizationId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatResponse {
  message: ChatMessage;
  sources: Array<{
    documentId: string;
    title: string;
    score: number;
    snippet: string;
  }>;
  tokensUsed: number;
}

export class ChatbotService {
  private vectorService: OrganizationDocumentVectorService | null = null;

  constructor() {
    this.initializeVectorService();
  }

  private async initializeVectorService() {
    try {
      const vectorDB = await initializeVectorDatabase();
      if (vectorDB) {
        this.vectorService = new OrganizationDocumentVectorService(vectorDB);
      }
    } catch (error) {
      console.error("Failed to initialize vector service:", error);
    }
  }

  /**
   * Generate a response to a user message using Groq and semantic search
   */
  async generateResponse(
    userMessage: string,
    organizationId: string,
    conversationHistory: ChatMessage[] = [],
    options: {
      maxSources?: number;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ChatResponse> {
    const { maxSources = 5, temperature = 0.7, maxTokens = 1024 } = options;

    try {
      // Step 1: Search for relevant documents
      const relevantDocs = await this.searchRelevantDocuments(
        userMessage,
        organizationId,
        maxSources
      );

      // Step 2: Build context from search results
      const context = this.buildContextFromDocuments(relevantDocs);

      // Step 3: Create system prompt for Groq
      const systemPrompt = this.createSystemPrompt(context);

      // Step 4: Build conversation history for Groq
      const grokMessages = this.buildGrokMessages(
        userMessage,
        systemPrompt,
        conversationHistory
      );

      // Step 5: Generate response with Groq
      const grokResponse = await grokClient.chat(grokMessages, {
        temperature,
        maxCompletionTokens: maxTokens,
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
   * Generate a streaming response
   */
  async *generateStreamResponse(
    userMessage: string,
    organizationId: string,
    conversationHistory: ChatMessage[] = [],
    options: {
      maxSources?: number;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<
    { content: string; isComplete: boolean; sources?: VectorSearchResult[] },
    void,
    unknown
  > {
    const { maxSources = 5, temperature = 0.7, maxTokens = 1024 } = options;

    try {
      // Step 1: Search for relevant documents
      const relevantDocs = await this.searchRelevantDocuments(
        userMessage,
        organizationId,
        maxSources
      );

      // Step 2: Build context from search results
      const context = this.buildContextFromDocuments(relevantDocs);

      // Step 3: Create system prompt for Groq
      const systemPrompt = this.createSystemPrompt(context);

      // Step 4: Build conversation history for Groq
      const grokMessages = this.buildGrokMessages(
        userMessage,
        systemPrompt,
        conversationHistory
      );

      // Step 5: Stream response with Groq

      for await (const chunk of grokClient.chatStream(grokMessages, {
        temperature,
        maxCompletionTokens: maxTokens,
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
   * Search for relevant documents using vector search
   */
  private async searchRelevantDocuments(
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
      metadata: VectorSearchResult["metadata"];
    }>
  > {
    if (!this.vectorService) {
      console.warn("Vector service not available, returning empty results");
      return [];
    }

    try {
      const searchResults =
        await this.vectorService.searchOrganizationDocuments(
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
            metadata: result.metadata,
          };
        })
        .filter((result) => result.document !== undefined);
    } catch (error) {
      console.error("Error searching documents:", error);
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
    }>
  ): string {
    if (documents.length === 0) {
      return "No relevant documents found in the knowledge base.";
    }

    const contextParts = documents.map((doc, index) => {
      if (!doc.document) return "";

      return `Document ${index + 1} (Relevance: ${(doc.score * 100).toFixed(
        1
      )}%):
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
   * Create system prompt for Groq
   */
  private createSystemPrompt(context: string): string {
    return `You are a helpful AI assistant for an organization's support center. You have access to the organization's knowledge base and should use it to provide accurate, helpful responses.

IMPORTANT INSTRUCTIONS:
1. Use ONLY the information provided in the context below to answer questions
2. If the context doesn't contain enough information to answer a question, clearly state that
3. Be specific and cite relevant parts of the documents when possible
4. If asked about something not in the knowledge base, politely explain that you don't have that information
5. Keep responses concise but comprehensive
6. Always be helpful and professional

CONTEXT FROM KNOWLEDGE BASE:
${context}

Remember: Only use information from the provided context. If you cannot answer based on the context, say so clearly.`;
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
    return grokClient.isConfigured() && this.vectorService !== null;
  }

  /**
   * Get service status
   */
  getStatus(): {
    groqConfigured: boolean;
    vectorServiceAvailable: boolean;
    fullyConfigured: boolean;
  } {
    return {
      groqConfigured: grokClient.isConfigured(),
      vectorServiceAvailable: this.vectorService !== null,
      fullyConfigured: this.isConfigured(),
    };
  }
}

// Create a default instance
export const chatbotService = new ChatbotService();
