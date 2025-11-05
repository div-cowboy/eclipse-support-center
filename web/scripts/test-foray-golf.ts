#!/usr/bin/env tsx

/**
 * Test script to specifically test Foray Golf organization description
 */

import { enhancedChatbotService } from "../lib/chatbot-service-enhanced";
import { prisma } from "../lib/prisma";

async function testForayGolf() {
  console.log("🧪 Testing Foray Golf Organization Description...\n");

  try {
    // Wait for vector services to initialize
    console.log("Waiting for vector services to initialize...");
    await enhancedChatbotService.waitForInitialization(10000);

    // Find the Foray Golf organization
    const forayGolfOrg = await prisma.organization.findFirst({
      where: {
        name: {
          contains: "Foray",
          mode: "insensitive",
        },
      },
      include: {
        chatbots: true,
      },
    });

    if (!forayGolfOrg) {
      console.log("❌ Foray Golf organization not found");
      return;
    }

    console.log(`✅ Found Foray Golf organization: ${forayGolfOrg.name}`);
    console.log(`   Description: ${forayGolfOrg.description}`);
    console.log(`   Chatbots: ${forayGolfOrg.chatbots.length}`);

    if (forayGolfOrg.chatbots.length === 0) {
      console.log("❌ No chatbots found for Foray Golf organization");
      return;
    }

    const chatbot = forayGolfOrg.chatbots[0];
    console.log(`\nTesting with chatbot: ${chatbot.name}`);

    // Test questions about Foray Golf
    const testQuestions = [
      "What is Foray Golf?",
      "Tell me about Foray Golf brand",
      "What does Foray Golf do?",
      "Who is Foray Golf?",
    ];

    for (const question of testQuestions) {
      console.log(`\n🔍 Testing question: "${question}"`);

      try {
        const response = await enhancedChatbotService.generateChatbotResponse(
          question,
          chatbot.id,
          [], // No conversation history
          {
            name: chatbot.name,
            temperature: 0.7,
            maxTokens: 300,
            maxSources: 5,
            includeOrganizationDocs: true,
            includeContextBlocks: true,
          }
        );

        console.log(`✅ Response: ${response.message.content}`);
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
            console.log(
              `        Content preview: ${source.snippet.substring(0, 100)}...`
            );
          });
        } else {
          console.log(
            "   ⚠️  No sources found - this might indicate the organization description isn't being indexed properly"
          );
        }
      } catch (error) {
        console.log(`❌ Error testing question: ${error}`);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testForayGolf();
