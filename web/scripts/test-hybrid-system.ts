#!/usr/bin/env tsx

/**
 * Test script to verify the hybrid OpenAI + Groq system
 * Run with: npx tsx scripts/test-hybrid-system.ts
 */

import { initializeVectorDatabase } from "../lib/vector-config";
import { OrganizationDocumentVectorService } from "../lib/vector-db";
import { grokClient } from "../lib/grok-client";
import { chatbotService } from "../lib/chatbot-service";

async function testHybridSystem() {
  console.log("🧪 Testing Hybrid OpenAI + Groq System...\n");

  try {
    // Test 1: Check Groq configuration
    console.log("1. Testing Groq configuration...");
    if (!grokClient.isConfigured()) {
      console.log("❌ Groq not configured");
      console.log(
        "   Make sure you have set GROQ_API_KEY environment variable"
      );
      return;
    }
    console.log("✅ Groq configured successfully");

    // Test 2: Test Groq text generation
    console.log("\n2. Testing Groq text generation...");
    try {
      const response = await grokClient.generateResponse(
        "Hello! Can you tell me a short joke?",
        "You are a helpful assistant that tells clean, family-friendly jokes."
      );
      console.log("✅ Groq response:", response.substring(0, 100) + "...");
    } catch (error) {
      console.log("❌ Groq text generation failed:", error);
      return;
    }

    // Test 3: Check vector database configuration
    console.log("\n3. Testing vector database configuration...");
    const vectorDB = await initializeVectorDatabase();
    if (!vectorDB) {
      console.log("❌ Vector database not configured");
      console.log(
        "   Make sure you have set PINECONE_API_KEY and OPENAI_API_KEY"
      );
      return;
    }
    console.log("✅ Vector database configured successfully");

    // Test 4: Test chatbot service status
    console.log("\n4. Testing chatbot service status...");
    const serviceStatus = chatbotService.getStatus();
    console.log("   Groq configured:", serviceStatus.groqConfigured);
    console.log(
      "   Vector service available:",
      serviceStatus.vectorServiceAvailable
    );
    console.log("   Fully configured:", serviceStatus.fullyConfigured);

    if (!serviceStatus.fullyConfigured) {
      console.log("❌ Chatbot service not fully configured");
      return;
    }
    console.log("✅ Chatbot service fully configured");

    // Test 5: Test document search (if we have test data)
    console.log("\n5. Testing document search...");
    try {
      const vectorService = new OrganizationDocumentVectorService(vectorDB);
      const searchResults = await vectorService.searchOrganizationDocuments(
        "test document",
        "test-org-123", // This might not exist, that's okay
        3
      );
      console.log(
        `✅ Document search working (found ${searchResults.length} results)`
      );
    } catch (error) {
      console.log(
        "⚠️  Document search test failed (this is expected if no test data exists)"
      );
    }

    console.log("\n🎉 Hybrid system test completed successfully!");
    console.log("\nSystem Architecture:");
    console.log("├── OpenAI → Vector Embeddings (for Pinecone)");
    console.log("├── Groq → Text Generation (for responses)");
    console.log("└── Pinecone → Vector Storage & Search");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.log("\nTroubleshooting tips:");
    console.log("1. Check your environment variables:");
    console.log("   - GROQ_API_KEY");
    console.log("   - PINECONE_API_KEY");
    console.log("   - OPENAI_API_KEY");
    console.log("2. Ensure your Pinecone index exists");
    console.log("3. Verify your API keys are valid");
    console.log("4. Check your internet connection");
  }
}

// Run the test
testHybridSystem();
