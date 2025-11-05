#!/usr/bin/env tsx

/**
 * Script to check chatbot configuration
 */

import { prisma } from "../lib/prisma";

async function checkChatbotConfig() {
  console.log("🔍 Checking Chatbot Configuration...\n");

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

    chatbots.forEach((chatbot, index) => {
      console.log(
        `${index + 1}. ${chatbot.name} (${chatbot.organization.name})`
      );
      console.log(`   ID: ${chatbot.id}`);
      console.log(`   Description: ${chatbot.description || "None"}`);
      console.log(`   Status: ${chatbot.status}`);
      console.log(`   Config:`, JSON.stringify(chatbot.config, null, 2));
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the check
checkChatbotConfig();
