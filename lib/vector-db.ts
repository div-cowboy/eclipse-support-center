// Vector Database Integration Utilities
// This file contains utilities for integrating with vector databases like Pinecone, Weaviate, or Chroma

export interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: {
    title: string;
    content: string;
    type: string;
    chatbotId: string;
    contextBlockId: string;
  };
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorEmbedding["metadata"];
}

// Abstract interface for vector database operations
export interface VectorDatabase {
  upsert(embeddings: VectorEmbedding[]): Promise<void>;
  search(
    query: number[],
    topK?: number,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  update(id: string, embedding: VectorEmbedding): Promise<void>;
}

// Example implementation for Pinecone (you'll need to install @pinecone-database/pinecone)
export class PineconeVectorDB implements VectorDatabase {
  private index: any; // Pinecone index

  constructor(index: any) {
    this.index = index;
  }

  async upsert(embeddings: VectorEmbedding[]): Promise<void> {
    const vectors = embeddings.map((embedding) => ({
      id: embedding.id,
      values: embedding.vector,
      metadata: embedding.metadata,
    }));

    await this.index.upsert(vectors);
  }

  async search(
    query: number[],
    topK: number = 10,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const searchRequest = {
      vector: query,
      topK,
      includeMetadata: true,
      ...(filter && { filter }),
    };

    const searchResponse = await this.index.query(searchRequest);

    return searchResponse.matches.map((match: any) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await this.index.deleteMany(ids);
  }

  async update(id: string, embedding: VectorEmbedding): Promise<void> {
    await this.index.upsert([
      {
        id,
        values: embedding.vector,
        metadata: embedding.metadata,
      },
    ]);
  }
}

// Example implementation for Chroma (you'll need to install chromadb)
export class ChromaVectorDB implements VectorDatabase {
  private collection: any; // Chroma collection

  constructor(collection: any) {
    this.collection = collection;
  }

  async upsert(embeddings: VectorEmbedding[]): Promise<void> {
    const ids = embeddings.map((e) => e.id);
    const vectors = embeddings.map((e) => e.vector);
    const metadatas = embeddings.map((e) => e.metadata);

    await this.collection.upsert({
      ids,
      embeddings: vectors,
      metadatas,
    });
  }

  async search(
    query: number[],
    topK: number = 10,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const searchResponse = await this.collection.query({
      queryEmbeddings: [query],
      nResults: topK,
      where: filter,
    });

    const results: VectorSearchResult[] = [];
    for (let i = 0; i < searchResponse.ids[0].length; i++) {
      results.push({
        id: searchResponse.ids[0][i],
        score: searchResponse.distances[0][i],
        metadata: searchResponse.metadatas[0][i],
      });
    }

    return results;
  }

  async delete(ids: string[]): Promise<void> {
    await this.collection.delete({ ids });
  }

  async update(id: string, embedding: VectorEmbedding): Promise<void> {
    await this.collection.update({
      ids: [id],
      embeddings: [embedding.vector],
      metadatas: [embedding.metadata],
    });
  }
}

// Embedding generation utilities
export class EmbeddingService {
  // This would integrate with OpenAI, Cohere, or other embedding services
  static async generateEmbedding(text: string): Promise<number[]> {
    // Check if OpenAI is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        // For OpenAI - you would need to install openai package
        // const { OpenAI } = await import("openai");
        // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // const response = await openai.embeddings.create({
        //   model: "text-embedding-ada-002",
        //   input: text,
        // });
        // return response.data[0].embedding;

        console.warn(
          "OpenAI package not installed. Install 'openai' to use real embeddings."
        );
      } catch (error) {
        console.error("Error generating OpenAI embedding:", error);
      }
    }

    // Fallback to mock embedding
    console.warn(
      "Using mock embedding - configure OpenAI API key and install 'openai' package for real embeddings"
    );
    return new Array(1536).fill(0).map(() => Math.random() - 0.5);
  }

  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Batch embedding generation for efficiency
    // If using OpenAI, you could batch requests for better performance
    const embeddings = await Promise.all(
      texts.map((text) => this.generateEmbedding(text))
    );
    return embeddings;
  }
}

// Context block vector operations
export class ContextBlockVectorService {
  constructor(private vectorDB: VectorDatabase) {}

  async createContextBlockEmbedding(
    contextBlockId: string,
    title: string,
    content: string,
    type: string,
    chatbotId: string
  ): Promise<string> {
    const text = `${title}\n\n${content}`;
    const embedding = await EmbeddingService.generateEmbedding(text);

    const vectorId = `context_${contextBlockId}`;
    const vectorEmbedding: VectorEmbedding = {
      id: vectorId,
      vector: embedding,
      metadata: {
        title,
        content,
        type,
        chatbotId,
        contextBlockId,
      },
    };

    await this.vectorDB.upsert([vectorEmbedding]);
    return vectorId;
  }

  async updateContextBlockEmbedding(
    vectorId: string,
    contextBlockId: string,
    title: string,
    content: string,
    type: string,
    chatbotId: string
  ): Promise<void> {
    const text = `${title}\n\n${content}`;
    const embedding = await EmbeddingService.generateEmbedding(text);

    const vectorEmbedding: VectorEmbedding = {
      id: vectorId,
      vector: embedding,
      metadata: {
        title,
        content,
        type,
        chatbotId,
        contextBlockId,
      },
    };

    await this.vectorDB.update(vectorId, vectorEmbedding);
  }

  async deleteContextBlockEmbedding(vectorId: string): Promise<void> {
    await this.vectorDB.delete([vectorId]);
  }

  async searchContextBlocks(
    query: string,
    chatbotId: string,
    topK: number = 10
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await EmbeddingService.generateEmbedding(query);

    return this.vectorDB.search(queryEmbedding, topK, {
      chatbotId,
    });
  }
}

// Organization document vector operations
export class OrganizationDocumentVectorService {
  constructor(private vectorDB: VectorDatabase) {}

  async createOrganizationDocumentEmbedding(
    documentId: string,
    title: string,
    content: string,
    type: string,
    organizationId: string
  ): Promise<string> {
    const text = `${title}\n\n${content}`;
    const embedding = await EmbeddingService.generateEmbedding(text);

    const vectorId = `org_doc_${documentId}`;
    const vectorEmbedding: VectorEmbedding = {
      id: vectorId,
      vector: embedding,
      metadata: {
        title,
        content,
        type,
        chatbotId: "", // Not applicable for org documents
        contextBlockId: documentId,
      },
    };

    await this.vectorDB.upsert([vectorEmbedding]);
    return vectorId;
  }

  async updateOrganizationDocumentEmbedding(
    vectorId: string,
    documentId: string,
    title: string,
    content: string,
    type: string,
    organizationId: string
  ): Promise<void> {
    const text = `${title}\n\n${content}`;
    const embedding = await EmbeddingService.generateEmbedding(text);

    const vectorEmbedding: VectorEmbedding = {
      id: vectorId,
      vector: embedding,
      metadata: {
        title,
        content,
        type,
        chatbotId: "", // Not applicable for org documents
        contextBlockId: documentId,
      },
    };

    await this.vectorDB.update(vectorId, vectorEmbedding);
  }

  async deleteOrganizationDocumentEmbedding(vectorId: string): Promise<void> {
    await this.vectorDB.delete([vectorId]);
  }

  async searchOrganizationDocuments(
    query: string,
    organizationId: string,
    topK: number = 10
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await EmbeddingService.generateEmbedding(query);

    return this.vectorDB.search(queryEmbedding, topK, {
      organizationId,
    });
  }
}

// Factory function to create vector database instance
export function createVectorDatabase(
  type: "pinecone" | "chroma",
  config: any
): VectorDatabase {
  switch (type) {
    case "pinecone":
      // Initialize Pinecone
      // const pinecone = new Pinecone({ apiKey: config.apiKey });
      // const index = pinecone.index(config.indexName);
      // return new PineconeVectorDB(index);
      throw new Error("Pinecone implementation not configured");

    case "chroma":
      // Initialize Chroma
      // const chroma = new ChromaClient({ path: config.path });
      // const collection = chroma.getCollection({ name: config.collectionName });
      // return new ChromaVectorDB(collection);
      throw new Error("Chroma implementation not configured");

    default:
      throw new Error(`Unsupported vector database type: ${type}`);
  }
}
