#!/usr/bin/env tsx

/**
 * Debug script to test organization description vector search directly
 */

import { initializeVectorDatabase } from "../lib/vector-config";
import { OrganizationDescriptionVectorService } from "../lib/vector-db";
import { prisma } from "../lib/prisma";

async function debugOrgDescriptionSearch() {
  console.log("🔍 Debugging Organization Description Vector Search...\n");

  try {
    // Initialize vector database
    const vectorDB = await initializeVectorDatabase();
    if (!vectorDB) {
      console.error("Failed to initialize vector database");
      return;
    }

    const vectorService = new OrganizationDescriptionVectorService(vectorDB);

    // Get Foray Golf organization
    const forayGolfOrg = await prisma.organization.findFirst({
      where: {
        name: {
          contains: "Foray",
          mode: "insensitive",
        },
      },
    });

    if (!forayGolfOrg) {
      console.log("❌ Foray Golf organization not found");
      return;
    }

    console.log(`✅ Found Foray Golf organization: ${forayGolfOrg.name}`);
    console.log(`   Description: ${forayGolfOrg.description}`);

    // Test direct vector search
    console.log("\n🔍 Testing direct vector search...");
    const searchResults = await vectorService.searchOrganizationDescriptions(
      "Foray Golf",
      forayGolfOrg.id,
      5
    );

    console.log(`   Search results: ${searchResults.length}`);
    searchResults.forEach((result, index) => {
      console.log(
        `   ${index + 1}. Score: ${(result.score * 100).toFixed(1)}%`
      );
      console.log(`      Title: ${result.metadata.title}`);
      console.log(`      Type: ${result.metadata.type}`);
      console.log(`      Organization ID: ${result.metadata.organizationId}`);
      console.log(
        `      Content preview: ${result.metadata.content.substring(0, 100)}...`
      );
    });

    // Test with different queries
    const testQueries = ["golf", "women", "brand", "golfwear", "Foray"];

    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);
      const results = await vectorService.searchOrganizationDescriptions(
        query,
        forayGolfOrg.id,
        3
      );
      console.log(`   Results: ${results.length}`);
      if (results.length > 0) {
        console.log(
          `   Best match: ${results[0].metadata.title} (${(
            results[0].score * 100
          ).toFixed(1)}%)`
        );
      }
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

// Run the debug
debugOrgDescriptionSearch();
