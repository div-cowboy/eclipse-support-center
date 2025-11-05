#!/usr/bin/env tsx

/**
 * Script to index existing organization descriptions in Pinecone
 * This should be run once to migrate existing organizations to the vector database
 */

import { prisma } from "../lib/prisma";
import { initializeVectorDatabase } from "../lib/vector-config";
import { OrganizationDescriptionVectorService } from "../lib/vector-db";

async function indexExistingOrganizationDescriptions() {
  console.log("Starting organization description indexing...");

  try {
    // Initialize vector database
    const vectorDB = await initializeVectorDatabase();
    if (!vectorDB) {
      console.error(
        "Failed to initialize vector database. Check your environment variables."
      );
      process.exit(1);
    }

    const vectorService = new OrganizationDescriptionVectorService(vectorDB);

    // Get all organizations with descriptions
    const organizations = await prisma.organization.findMany({
      where: {
        description: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    console.log(
      `Found ${organizations.length} organizations with descriptions`
    );

    let successCount = 0;
    let errorCount = 0;

    for (const org of organizations) {
      try {
        if (org.description) {
          const vectorId =
            await vectorService.createOrganizationDescriptionEmbedding(
              org.id,
              org.name,
              org.description
            );
          console.log(`✓ Indexed: ${org.name} (${org.id})`);
          successCount++;
        }
      } catch (error) {
        console.error(`✗ Failed to index ${org.name} (${org.id}):`, error);
        errorCount++;
      }
    }

    console.log("\n=== Indexing Complete ===");
    console.log(`Successfully indexed: ${successCount} organizations`);
    console.log(`Failed to index: ${errorCount} organizations`);
    console.log(`Total processed: ${organizations.length} organizations`);
  } catch (error) {
    console.error("Error during indexing:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  indexExistingOrganizationDescriptions()
    .then(() => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { indexExistingOrganizationDescriptions };
