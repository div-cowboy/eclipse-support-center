#!/usr/bin/env tsx

/**
 * Script to update chatbot configuration to include organization descriptions
 */

import { prisma } from "../lib/prisma";

async function updateChatbotConfig() {
  console.log("🔧 Updating Chatbot Configuration...\n");

  try {
    // Get all chatbots
    const chatbots = await prisma.chatbot.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    console.log(`Found ${chatbots.length} chatbot(s):\n`);

    for (const chatbot of chatbots) {
      console.log(`Updating ${chatbot.name} (${chatbot.organization.name})...`);

      // Update the chatbot config to ensure organization descriptions are included
      const updatedConfig = {
        ...(chatbot.config as Record<string, unknown>),
        systemPrompt:
          "You are Eclipse Support Bot, specialized in IDE assistance. You help developers with Eclipse IDE issues, debugging, and best practices. Always provide step-by-step solutions and use Eclipse-specific terminology when relevant.",
        includeOrganizationDocs: true,
        includeContextBlocks: true,
        maxSources: 8,
        temperature: 0.7,
        maxTokens: 1024,
      };

      await prisma.chatbot.update({
        where: { id: chatbot.id },
        data: { config: updatedConfig },
      });

      console.log(`✅ Updated ${chatbot.name}`);
      console.log(`   Config:`, JSON.stringify(updatedConfig, null, 2));
      console.log("");
    }

    console.log("🎉 All chatbots updated successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the update
updateChatbotConfig();
