#!/usr/bin/env tsx

/**
 * Test script to verify Pinecone integration
 * Run with: npx tsx scripts/test-pinecone.ts
 */

import { initializeVectorDatabase } from "../lib/vector-config";
import { OrganizationDocumentVectorService } from "../lib/vector-db";

async function testPineconeIntegration() {
  console.log("🧪 Testing Pinecone Integration...\n");

  try {
    // Test 1: Initialize vector database
    console.log("1. Initializing vector database...");
    const vectorDB = await initializeVectorDatabase();

    if (!vectorDB) {
      console.log("❌ Vector database initialization failed");
      console.log(
        "   Make sure you have set the following environment variables:"
      );
      console.log("   - PINECONE_API_KEY");
      console.log("   - PINECONE_INDEX_NAME");
      console.log("   - OPENAI_API_KEY");
      return;
    }

    console.log("✅ Vector database initialized successfully");

    // Test 2: Create a test document embedding
    console.log("\n2. Creating test document embedding...");
    const vectorService = new OrganizationDocumentVectorService(vectorDB);

    const testDocId = "test-doc-" + Date.now();
    const testTitle = "Test Document";
    const testContent =
      "This is a test document to verify that our Pinecone integration is working correctly. It contains sample content for testing semantic search capabilities.";
    const testType = "TEXT";
    const testOrgId = "test-org-123";

    const vectorId = await vectorService.createOrganizationDocumentEmbedding(
      testDocId,
      testTitle,
      testContent,
      testType,
      testOrgId
    );

    console.log(`✅ Created embedding with vector ID: ${vectorId}`);

    // Test 3: Search for the document
    console.log("\n3. Testing semantic search...");
    const searchResults = await vectorService.searchOrganizationDocuments(
      "test document verification",
      testOrgId,
      5
    );

    console.log(`✅ Found ${searchResults.length} search results`);

    if (searchResults.length > 0) {
      console.log("   Top result:");
      console.log(`   - Score: ${searchResults[0].score}`);
      console.log(`   - Title: ${searchResults[0].metadata.title}`);
      console.log(
        `   - Content preview: ${searchResults[0].metadata.content.substring(
          0,
          100
        )}...`
      );
    }

    // Test 4: Clean up test data
    console.log("\n4. Cleaning up test data...");
    await vectorService.deleteOrganizationDocumentEmbedding(vectorId);
    console.log("✅ Test data cleaned up");

    console.log(
      "\n🎉 All tests passed! Pinecone integration is working correctly."
    );
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.log("\nTroubleshooting tips:");
    console.log("1. Check your environment variables");
    console.log("2. Ensure your Pinecone index exists");
    console.log("3. Verify your OpenAI API key is valid");
    console.log("4. Check your internet connection");
  }
}

// Run the test
testPineconeIntegration();
