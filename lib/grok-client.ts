// Grok Client for LLM Operations
// This file provides a reusable client for interacting with Grok's API

import { Groq } from "groq-sdk";

export interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GrokChatOptions {
  model?: string;
  temperature?: number;
  maxCompletionTokens?: number;
  topP?: number;
  stream?: boolean;
  stop?: string | string[] | null;
}

export interface GrokChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GrokStreamChunk {
  content: string;
  isComplete: boolean;
}

export class GrokClient {
  private groqClient!: Groq;
  private defaultModel: string;
  private defaultOptions: GrokChatOptions;

  constructor(apiKey?: string) {
    this.groqClient = new Groq({
      apiKey: apiKey || process.env.GROQ_API_KEY || "",
    });

    // Default model - you can change this based on your needs
    this.defaultModel = "llama-3.1-8b-instant";

    this.defaultOptions = {
      model: this.defaultModel,
      temperature: 0.7,
      maxCompletionTokens: 1024,
      topP: 1,
      stream: false,
      stop: null,
    };
  }

  /**
   * Create a chat completion with Grok
   */
  async chat(
    messages: GrokMessage[],
    options: Partial<GrokChatOptions> = {}
  ): Promise<GrokChatResponse> {
    const config = { ...this.defaultOptions, ...options };

    try {
      const completion = await this.groqClient.chat.completions.create({
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        model: config.model!,
        temperature: config.temperature,
        max_tokens: config.maxCompletionTokens,
        top_p: config.topP,
        stream: false,
        stop: config.stop,
      });

      const choice = completion.choices[0];
      if (!choice?.message?.content) {
        throw new Error("No content received from Grok");
      }

      return {
        content: choice.message.content,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      console.error("Grok chat completion error:", error);
      throw new Error(
        `Grok API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Create a streaming chat completion with Grok
   */
  async *chatStream(
    messages: GrokMessage[],
    options: Partial<GrokChatOptions> = {}
  ): AsyncGenerator<GrokStreamChunk, void, unknown> {
    const config = { ...this.defaultOptions, ...options, stream: true };

    try {
      const completion = await this.groqClient.chat.completions.create({
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        model: config.model!,
        temperature: config.temperature,
        max_tokens: config.maxCompletionTokens,
        top_p: config.topP,
        stream: true,
        stop: config.stop,
      });

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || "";
        const isComplete = chunk.choices[0]?.finish_reason === "stop";

        yield {
          content,
          isComplete,
        };
      }
    } catch (error) {
      console.error("Grok streaming error:", error);
      throw new Error(
        `Grok streaming error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate a simple response to a user message
   */
  async generateResponse(
    userMessage: string,
    systemPrompt?: string,
    options: Partial<GrokChatOptions> = {}
  ): Promise<string> {
    const messages: GrokMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: userMessage });

    const response = await this.chat(messages, options);
    return response.content;
  }

  /**
   * Generate a streaming response to a user message
   */
  async *generateStreamResponse(
    userMessage: string,
    systemPrompt?: string,
    options: Partial<GrokChatOptions> = {}
  ): AsyncGenerator<GrokStreamChunk, void, unknown> {
    const messages: GrokMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: userMessage });

    yield* this.chatStream(messages, options);
  }

  /**
   * Summarize text content
   */
  async summarize(
    text: string,
    maxLength: number = 200,
    options: Partial<GrokChatOptions> = {}
  ): Promise<string> {
    const systemPrompt = `You are a helpful assistant that summarizes text content. 
    Provide a concise summary in approximately ${maxLength} characters or less. 
    Focus on the key points and main ideas.`;

    const userMessage = `Please summarize the following text:\n\n${text}`;

    return this.generateResponse(userMessage, systemPrompt, {
      ...options,
      maxCompletionTokens: Math.min(maxLength * 2, 500), // Allow some buffer
    });
  }

  /**
   * Extract key information from text
   */
  async extractKeyInfo(
    text: string,
    options: Partial<GrokChatOptions> = {}
  ): Promise<string> {
    const systemPrompt = `You are a helpful assistant that extracts key information from text.
    Identify and list the most important facts, concepts, and details.
    Format your response as a clear, organized list.`;

    const userMessage = `Extract the key information from this text:\n\n${text}`;

    return this.generateResponse(userMessage, systemPrompt, options);
  }

  /**
   * Answer questions based on provided context
   */
  async answerQuestion(
    question: string,
    context: string,
    options: Partial<GrokChatOptions> = {}
  ): Promise<string> {
    const systemPrompt = `You are a helpful assistant that answers questions based on the provided context.
    Use only the information in the context to answer the question.
    If the context doesn't contain enough information to answer the question, say so clearly.
    Be accurate and cite specific parts of the context when relevant.`;

    const userMessage = `Context:\n${context}\n\nQuestion: ${question}`;

    return this.generateResponse(userMessage, systemPrompt, options);
  }

  /**
   * Get available models (this would need to be implemented based on Grok's API)
   */
  async getAvailableModels(): Promise<string[]> {
    // Note: This is a placeholder - Grok's API might not expose model listing
    // You might need to hardcode available models or check their documentation
    return [
      "llama-3.1-8b-instant",
      "llama-3.1-70b-versatile",
      "mixtral-8x7b-32768",
      "gemma-7b-it",
    ];
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.GROQ_API_KEY || this.groqClient.apiKey);
  }

  /**
   * Get current configuration
   */
  getConfig(): { model: string; options: GrokChatOptions } {
    return {
      model: this.defaultModel,
      options: { ...this.defaultOptions },
    };
  }
}

// Create a default instance
export const grokClient = new GrokClient();

// Utility functions for common operations
export const grokUtils = {
  /**
   * Create a conversation with context
   */
  createConversation: (systemPrompt?: string) => {
    const messages: GrokMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    return messages;
  },

  /**
   * Add a user message to conversation
   */
  addUserMessage: (messages: GrokMessage[], content: string): GrokMessage[] => {
    return [...messages, { role: "user", content }];
  },

  /**
   * Add an assistant message to conversation
   */
  addAssistantMessage: (
    messages: GrokMessage[],
    content: string
  ): GrokMessage[] => {
    return [...messages, { role: "assistant", content }];
  },

  /**
   * Get the last user message from conversation
   */
  getLastUserMessage: (messages: GrokMessage[]): string | null => {
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((msg) => msg.role === "user");
    return lastUserMessage?.content || null;
  },

  /**
   * Truncate conversation to fit within token limits
   */
  truncateConversation: (
    messages: GrokMessage[],
    maxMessages: number = 10
  ): GrokMessage[] => {
    if (messages.length <= maxMessages) {
      return messages;
    }

    // Keep system message and recent messages
    const systemMessage = messages.find((msg) => msg.role === "system");
    const recentMessages = messages.slice(
      -maxMessages + (systemMessage ? 1 : 0)
    );

    return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
  },
};
