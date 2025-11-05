// Example usage of vector search functionality
// This file demonstrates how to use the vector search features

import {
  OrganizationDocumentVectorService,
  ContextBlockVectorService,
} from "./vector-db";
import { initializeVectorDatabase } from "./vector-config";
import { processOrganizationDocument } from "./text-processing";

/**
 * Example: Search organization documents
 */
export async function searchOrganizationDocumentsExample() {
  try {
    // Initialize vector database
    const vectorDB = await initializeVectorDatabase();
    if (!vectorDB) {
      console.log("Vector database not configured");
      return;
    }

    // Create vector service
    const vectorService = new OrganizationDocumentVectorService(vectorDB);

    // Search for documents
    const results = await vectorService.searchOrganizationDocuments(
      "How do I request vacation time?",
      "org-123", // organization ID
      5 // top 5 results
    );

    console.log("Search results:", results);
    return results;
  } catch (error) {
    console.error("Error searching organization documents:", error);
  }
}

/**
 * Example: Search chatbot context blocks
 */
export async function searchContextBlocksExample() {
  try {
    const vectorDB = await initializeVectorDatabase();
    if (!vectorDB) {
      console.log("Vector database not configured");
      return;
    }

    const vectorService = new ContextBlockVectorService(vectorDB);

    const results = await vectorService.searchContextBlocks(
      "Eclipse IDE installation guide",
      "chatbot-456", // chatbot ID
      3 // top 3 results
    );

    console.log("Context block search results:", results);
    return results;
  } catch (error) {
    console.error("Error searching context blocks:", error);
  }
}

/**
 * Example: Process and store a document
 */
export async function processDocumentExample() {
  try {
    const documentId = "doc-789";
    const title = "Employee Handbook";
    const content = `
      Welcome to our company! This handbook contains important information about our policies and procedures.
      
      Vacation Policy:
      - Full-time employees receive 15 days of paid vacation per year
      - Vacation requests must be submitted at least 2 weeks in advance
      - Vacation time does not roll over to the next year
      
      Sick Leave:
      - Employees receive 10 days of paid sick leave per year
      - Sick leave can be used for illness, medical appointments, or family emergencies
      - Documentation may be required for extended absences
    `;
    const type = "MANUAL";
    const organizationId = "org-123";

    // Process the document into chunks
    const chunks = processOrganizationDocument(
      documentId,
      title,
      content,
      type,
      organizationId
    );

    console.log("Processed document chunks:", chunks);

    // Store in vector database (if configured)
    const vectorDB = await initializeVectorDatabase();
    if (vectorDB) {
      const vectorService = new OrganizationDocumentVectorService(vectorDB);

      for (const chunk of chunks) {
        const vectorId =
          await vectorService.createOrganizationDocumentEmbedding(
            chunk.id,
            chunk.title,
            chunk.content,
            chunk.metadata.type,
            chunk.metadata.organizationId
          );
        console.log(`Created vector for chunk ${chunk.id}: ${vectorId}`);
      }
    }

    return chunks;
  } catch (error) {
    console.error("Error processing document:", error);
  }
}

/**
 * Example: Complete workflow - create org with documents and search
 */
export async function completeWorkflowExample() {
  try {
    console.log("=== Complete Workflow Example ===");

    // 1. Create organization with documents
    const orgData = {
      name: "Acme Corporation",
      description: "A technology company",
      slug: "acme-corp",
      documents: [
        {
          title: "Employee Handbook",
          content:
            "This handbook contains all company policies and procedures...",
          type: "MANUAL",
        },
        {
          title: "IT Security Policy",
          content: "All employees must follow these security guidelines...",
          type: "POLICY",
        },
      ],
    };

    console.log("1. Creating organization with documents...");
    const orgResponse = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orgData),
    });

    if (!orgResponse.ok) {
      throw new Error("Failed to create organization");
    }

    const organization = await orgResponse.json();
    console.log("Created organization:", organization.id);

    // 2. Search for documents
    console.log("2. Searching for documents...");
    const searchResults = await searchOrganizationDocumentsExample();
    console.log("Search completed");

    // 3. Add more documents
    console.log("3. Adding additional document...");
    const docResponse = await fetch(
      `/api/organizations/${organization.id}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Remote Work Policy",
          content: "Guidelines for working remotely and hybrid arrangements...",
          type: "POLICY",
        }),
      }
    );

    if (!docResponse.ok) {
      throw new Error("Failed to create document");
    }

    const document = await docResponse.json();
    console.log("Created document:", document.id);

    console.log("=== Workflow completed successfully ===");
    return { organization, searchResults, document };
  } catch (error) {
    console.error("Error in complete workflow:", error);
  }
}
