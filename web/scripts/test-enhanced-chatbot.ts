#!/usr/bin/env tsx

/**
 * Test script to verify the enhanced chatbot system
 * Run with: npx tsx scripts/test-enhanced-chatbot.ts
 */

import { enhancedChatbotService } from "../lib/chatbot-service-enhanced";
import { prisma } from "../lib/prisma";

async function testEnhancedChatbot() {
  console.log("🧪 Testing Enhanced Chatbot System...\n");

  try {
    // Test 1: Check service configuration
    console.log("1. Testing enhanced chatbot service configuration...");

    // Wait for vector services to initialize
    console.log("   Waiting for vector services to initialize...");
    const initialized = await enhancedChatbotService.waitForInitialization(
      10000
    );

    const serviceStatus = enhancedChatbotService.getStatus();
    console.log("   Groq configured:", serviceStatus.groqConfigured);
    console.log(
      "   Organization vector service:",
      serviceStatus.organizationVectorServiceAvailable
    );
    console.log(
      "   Context block vector service:",
      serviceStatus.contextBlockVectorServiceAvailable
    );
    console.log(
      "   Organization description vector service:",
      serviceStatus.organizationDescriptionVectorServiceAvailable
    );
    console.log("   Fully configured:", serviceStatus.fullyConfigured);

    if (!serviceStatus.fullyConfigured) {
      console.log("❌ Enhanced chatbot service not fully configured");
      console.log("   Vector services initialized:", initialized);
      return;
    }
    console.log("✅ Enhanced chatbot service configured successfully");

    // Test 2: Check for existing chatbots
    console.log("\n2. Checking for existing chatbots...");
    const chatbots = await prisma.chatbot.findMany({
      take: 3,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            documents: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        contextBlocks: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (chatbots.length === 0) {
      console.log(
        "⚠️  No chatbots found. Create a chatbot first to test the system."
      );
      console.log(
        "   You can create one through the UI or by adding test data."
      );
      return;
    }

    console.log(`✅ Found ${chatbots.length} chatbot(s)`);
    chatbots.forEach((chatbot, index) => {
      console.log(
        `   ${index + 1}. ${chatbot.name} (${chatbot.organization.name})`
      );
      console.log(
        `      - Organization docs: ${chatbot.organization.documents.length}`
      );
      console.log(`      - Context blocks: ${chatbot.contextBlocks.length}`);
    });

    // Test 3: Test chatbot response generation
    console.log("\n3. Testing chatbot response generation...");
    const testChatbot = chatbots[0];
    const testMessage = "Hello! Can you tell me about your capabilities?";

    try {
      const response = await enhancedChatbotService.generateChatbotResponse(
        testMessage,
        testChatbot.id,
        [], // No conversation history
        {
          name: testChatbot.name,
          temperature: 0.7,
          maxTokens: 200,
          maxSources: 3,
        }
      );

      console.log("✅ Chatbot response generated successfully");
      console.log(
        `   Response: ${response.message.content.substring(0, 100)}...`
      );
      console.log(`   Sources found: ${response.sources.length}`);
      console.log(`   Tokens used: ${response.tokensUsed}`);

      if (response.sources.length > 0) {
        console.log("   Sources:");
        response.sources.forEach((source, index) => {
          console.log(
            `     ${index + 1}. ${source.title} (${source.type}, ${(
              source.score * 100
            ).toFixed(1)}%)`
          );
        });
      }
    } catch (error) {
      console.log("❌ Chatbot response generation failed:", error);
      return;
    }

    // Test 4: Test streaming response
    console.log("\n4. Testing streaming response...");
    try {
      let streamedContent = "";
      let sources: any[] = [];

      for await (const chunk of enhancedChatbotService.generateChatbotStreamResponse(
        "What can you help me with?",
        testChatbot.id,
        [],
        {
          name: testChatbot.name,
          temperature: 0.7,
          maxTokens: 150,
          maxSources: 2,
        }
      )) {
        streamedContent += chunk.content;
        if (chunk.sources) {
          sources = chunk.sources;
        }
      }

      console.log("✅ Streaming response generated successfully");
      console.log(
        `   Streamed content: ${streamedContent.substring(0, 100)}...`
      );
      console.log(`   Sources found: ${sources.length}`);
    } catch (error) {
      console.log("❌ Streaming response failed:", error);
    }

    console.log("\n🎉 Enhanced chatbot system test completed successfully!");
    console.log("\nSystem Architecture:");
    console.log("├── Organizations → Organization Documents (vector search)");
    console.log("├── Chatbots → Context Blocks (vector search)");
    console.log("├── OpenAI → Vector Embeddings (for both)");
    console.log("├── Groq → Text Generation (for responses)");
    console.log("└── Pinecone → Vector Storage & Search");

    console.log("\nNext Steps:");
    console.log("1. Create chatbots through the UI");
    console.log("2. Add context blocks to chatbots");
    console.log("3. Upload organization documents");
    console.log("4. Test the chat interface at /app/chatbots/[id]/chat");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.log("\nTroubleshooting tips:");
    console.log("1. Check your environment variables:");
    console.log("   - GROQ_API_KEY");
    console.log("   - PINECONE_API_KEY");
    console.log("   - OPENAI_API_KEY");
    console.log("2. Ensure your database is set up and migrated");
    console.log(
      "3. Create some test data (organizations, chatbots, documents)"
    );
    console.log("4. Verify your API keys are valid");
  }
}

// Run the test
testEnhancedChatbot();
