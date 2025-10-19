// Text Processing Utilities for Vector Storage
// This file contains utilities for processing text content before storing in vector databases

export interface TextChunk {
  id: string;
  content: string;
  title: string;
  metadata: {
    originalDocumentId: string;
    chunkIndex: number;
    totalChunks: number;
    type: string;
    organizationId: string;
  };
}

export class TextProcessor {
  private static readonly DEFAULT_CHUNK_SIZE = 1000;
  private static readonly DEFAULT_CHUNK_OVERLAP = 200;

  /**
   * Split text into chunks for better vector storage
   * @param text The text to split
   * @param chunkSize Maximum characters per chunk
   * @param overlap Number of characters to overlap between chunks
   * @returns Array of text chunks
   */
  static splitTextIntoChunks(
    text: string,
    chunkSize: number = this.DEFAULT_CHUNK_SIZE,
    overlap: number = this.DEFAULT_CHUNK_OVERLAP
  ): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // Try to break at sentence or paragraph boundaries
      if (end < text.length) {
        const lastSentence = text.lastIndexOf(".", end);
        const lastParagraph = text.lastIndexOf("\n\n", end);
        const lastBreak = text.lastIndexOf("\n", end);

        if (lastSentence > start + chunkSize * 0.7) {
          end = lastSentence + 1;
        } else if (lastParagraph > start + chunkSize * 0.7) {
          end = lastParagraph;
        } else if (lastBreak > start + chunkSize * 0.7) {
          end = lastBreak;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = Math.max(start + chunkSize - overlap, end);
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Create text chunks with metadata for vector storage
   * @param documentId The ID of the original document
   * @param title The title of the document
   * @param content The content to chunk
   * @param type The type of document
   * @param organizationId The organization ID
   * @param chunkSize Optional chunk size
   * @param overlap Optional overlap size
   * @returns Array of text chunks with metadata
   */
  static createDocumentChunks(
    documentId: string,
    title: string,
    content: string,
    type: string,
    organizationId: string,
    chunkSize?: number,
    overlap?: number
  ): TextChunk[] {
    const textChunks = this.splitTextIntoChunks(content, chunkSize, overlap);

    return textChunks.map((chunk, index) => ({
      id: `${documentId}_chunk_${index}`,
      content: chunk,
      title: title,
      metadata: {
        originalDocumentId: documentId,
        chunkIndex: index,
        totalChunks: textChunks.length,
        type,
        organizationId,
      },
    }));
  }

  /**
   * Clean and normalize text content
   * @param text The text to clean
   * @returns Cleaned text
   */
  static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\r/g, "\n") // Normalize line endings
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
      .replace(/\s{2,}/g, " ") // Replace multiple spaces with single space
      .trim();
  }

  /**
   * Extract key information from text for metadata
   * @param text The text to analyze
   * @returns Object with extracted metadata
   */
  static extractTextMetadata(text: string): {
    wordCount: number;
    characterCount: number;
    estimatedReadingTime: number;
    hasCode: boolean;
    hasUrls: boolean;
    hasEmails: boolean;
  } {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const characters = text.length;
    const estimatedReadingTime = Math.ceil(words.length / 200); // Average reading speed

    const hasCode = /```|`|function\s*\(|class\s+\w+|import\s+/.test(text);
    const hasUrls = /https?:\/\/[^\s]+/.test(text);
    const hasEmails =
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text);

    return {
      wordCount: words.length,
      characterCount: characters,
      estimatedReadingTime,
      hasCode,
      hasUrls,
      hasEmails,
    };
  }

  /**
   * Validate text content for processing
   * @param text The text to validate
   * @returns Validation result
   */
  static validateText(text: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!text || text.trim().length === 0) {
      errors.push("Text content cannot be empty");
    }

    if (text.length > 100000) {
      errors.push("Text content is too long (max 100,000 characters)");
    }

    if (text.length < 10) {
      errors.push("Text content is too short (min 10 characters)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Utility function to process organization document content
 * @param documentId The document ID
 * @param title The document title
 * @param content The document content
 * @param type The document type
 * @param organizationId The organization ID
 * @returns Processed chunks ready for vector storage
 */
export function processOrganizationDocument(
  documentId: string,
  title: string,
  content: string,
  type: string,
  organizationId: string
): TextChunk[] {
  // Clean the text
  const cleanedContent = TextProcessor.cleanText(content);

  // Validate the text
  const validation = TextProcessor.validateText(cleanedContent);
  if (!validation.isValid) {
    throw new Error(`Text validation failed: ${validation.errors.join(", ")}`);
  }

  // Extract metadata
  const metadata = TextProcessor.extractTextMetadata(cleanedContent);

  // Create chunks
  const chunks = TextProcessor.createDocumentChunks(
    documentId,
    title,
    cleanedContent,
    type,
    organizationId
  );

  // Add extracted metadata to each chunk
  return chunks.map((chunk) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      ...metadata,
    },
  }));
}
