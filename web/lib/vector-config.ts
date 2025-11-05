// Vector Database Configuration
// This file contains configuration and initialization for vector databases

import { VectorDatabase, PineconeVectorDB } from "./vector-db";

// Environment variables for vector database configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME =
  process.env.PINECONE_INDEX_NAME || "eclipse-support-center";
const PINECONE_ENVIRONMENT =
  process.env.PINECONE_ENVIRONMENT || "us-east-1-aws";

// OpenAI configuration for embeddings
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Groq configuration for text generation
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export interface VectorDBConfig {
  type: "pinecone" | "chroma";
  pinecone?: {
    apiKey: string;
    indexName: string;
    environment: string;
  };
  openai?: {
    apiKey: string;
    model?: string;
  };
  groq?: {
    apiKey: string;
    model?: string;
  };
}

/**
 * Initialize and configure the vector database
 */
export async function initializeVectorDatabase(): Promise<VectorDatabase | null> {
  try {
    // Check if we have the required environment variables
    if (!PINECONE_API_KEY || !OPENAI_API_KEY) {
      console.warn(
        "Vector database not configured. Missing required environment variables:"
      );
      if (!PINECONE_API_KEY) console.warn("- PINECONE_API_KEY");
      if (!OPENAI_API_KEY) console.warn("- OPENAI_API_KEY");
      return null;
    }

    // Initialize Pinecone
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    console.log("Pinecone initialized successfully");
    return new PineconeVectorDB(index);
  } catch (error) {
    console.error("Failed to initialize vector database:", error);
    return null;
  }
}

/**
 * Initialize OpenAI embeddings service
 */
export function initializeEmbeddingService() {
  if (!OPENAI_API_KEY) {
    console.warn(
      "OpenAI API key not configured. Embeddings will use mock data."
    );
    return false;
  }

  // You would initialize OpenAI here
  // const { OpenAI } = await import("openai");
  // const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  return true;
}

/**
 * Get vector database configuration
 */
export function getVectorDBConfig(): VectorDBConfig {
  return {
    type: "pinecone",
    pinecone: {
      apiKey: PINECONE_API_KEY || "",
      indexName: PINECONE_INDEX_NAME,
      environment: PINECONE_ENVIRONMENT,
    },
    openai: {
      apiKey: OPENAI_API_KEY || "",
      model: "text-embedding-3-small",
    },
    groq: {
      apiKey: GROQ_API_KEY || "",
      model: "llama-3.1-8b-instant",
    },
  };
}

/**
 * Check if vector database is properly configured
 */
export function isVectorDBConfigured(): boolean {
  return !!(PINECONE_API_KEY && OPENAI_API_KEY);
}

/**
 * Environment variable documentation
 */
export const ENVIRONMENT_VARIABLES = {
  PINECONE_API_KEY: "Your Pinecone API key for vector database access",
  PINECONE_INDEX_NAME:
    "Name of the Pinecone index to use (default: eclipse-support-center)",
  PINECONE_ENVIRONMENT: "Pinecone environment/region (default: us-east-1-aws)",
  OPENAI_API_KEY: "Your OpenAI API key for generating embeddings",
  GROQ_API_KEY: "Your Groq API key for text generation",
} as const;
