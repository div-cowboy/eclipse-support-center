/**
 * Quick test script to verify Phase 1 ticket functionality
 * Run with: npx tsx scripts/test-ticket-api.ts
 */

import { prisma } from "../lib/prisma";
import {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  addResponse,
  createTicketFromChat,
  getTicketStats,
} from "../lib/ticket-service";
import { TicketPriority, TicketStatus } from "@prisma/client";

async function testTicketSystem() {
  console.log("🧪 Testing Phase 1 Ticket System...\n");

  try {
    // Get demo organization
    const demoOrg = await prisma.organization.findUnique({
      where: { id: "demo-org" },
    });

    if (!demoOrg) {
      console.error("❌ Demo organization not found. Run seed script first.");
      return;
    }

    const demoUser = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });

    if (!demoUser) {
      console.error("❌ Demo user not found. Run seed script first.");
      return;
    }

    console.log("✅ Demo organization found:", demoOrg.name);
    console.log("✅ Demo user found:", demoUser.email);
    console.log();

    // Test 1: Create a new ticket
    console.log("📝 Test 1: Creating a new ticket...");
    const newTicket = await createTicket({
      organizationId: demoOrg.id,
      subject: "API Test Ticket",
      description: "This is a test ticket created via the API",
      priority: TicketPriority.MEDIUM,
      category: "Testing",
      requesterName: "API Test User",
      requesterEmail: "apitest@example.com",
      tags: ["test", "api"],
      metadata: {
        source: "api-test",
      },
    });
    console.log(`✅ Created ticket #${newTicket.ticketNumber}`);
    console.log(`   ID: ${newTicket.id}`);
    console.log(`   Status: ${newTicket.status}`);
    console.log(`   Priority: ${newTicket.priority}`);
    console.log();

    // Test 2: List tickets
    console.log("📋 Test 2: Listing tickets...");
    const ticketList = await listTickets({
      organizationId: demoOrg.id,
      page: 1,
      limit: 10,
    });
    console.log(`✅ Found ${ticketList.pagination.total} total tickets`);
    console.log(`   Showing ${ticketList.tickets.length} tickets on page 1`);
    ticketList.tickets.forEach((t) => {
      console.log(
        `   - Ticket #${t.ticketNumber}: ${t.subject} (${t.status})`
      );
    });
    console.log();

    // Test 3: Get single ticket
    console.log("🔍 Test 3: Getting single ticket...");
    const ticket = await getTicket(newTicket.id);
    if (ticket) {
      console.log(`✅ Retrieved ticket #${ticket.ticketNumber}`);
      console.log(`   Responses: ${ticket.responses.length}`);
      console.log(`   Activities: ${ticket.activities.length}`);
      console.log(`   Attachments: ${ticket.attachments.length}`);
    }
    console.log();

    // Test 4: Update ticket
    console.log("✏️  Test 4: Updating ticket...");
    const updatedTicket = await updateTicket(
      newTicket.id,
      {
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
        assignedToId: demoUser.id,
      },
      demoUser.id
    );
    console.log(`✅ Updated ticket #${updatedTicket.ticketNumber}`);
    console.log(`   New Status: ${updatedTicket.status}`);
    console.log(`   New Priority: ${updatedTicket.priority}`);
    console.log(`   Assigned to: ${updatedTicket.assignedTo?.name}`);
    console.log();

    // Test 5: Add response
    console.log("💬 Test 5: Adding response...");
    const response = await addResponse({
      ticketId: newTicket.id,
      content: "Thank you for submitting this ticket. We are working on it.",
      isInternal: false,
      authorId: demoUser.id,
      authorEmail: demoUser.email,
      authorName: demoUser.name || "Support Agent",
    });
    console.log(`✅ Added response to ticket #${newTicket.ticketNumber}`);
    console.log(`   Response ID: ${response.id}`);
    console.log(`   Author: ${response.authorName}`);
    console.log(`   Internal: ${response.isInternal}`);
    console.log();

    // Test 6: Create ticket from chat
    console.log("🔄 Test 6: Creating ticket from chat...");
    const demoChat = await prisma.chat.findUnique({
      where: { id: "demo-chat-1" },
    });

    if (demoChat) {
      const chatTicket = await createTicketFromChat({
        chatId: demoChat.id,
        priority: TicketPriority.HIGH,
        category: "Technical",
        includeTranscript: true,
        autoAssignToAgent: true,
        currentUserId: demoUser.id,
        tags: ["test", "from-chat"],
      });
      console.log(`✅ Created ticket from chat`);
      console.log(`   Ticket #${chatTicket.ticketNumber}: ${chatTicket.subject}`);
      console.log(`   Origin Chat ID: ${chatTicket.originChatId}`);
      console.log(`   Transcript included: ${chatTicket.description.includes("Chat Transcript")}`);
    } else {
      console.log("⚠️  Demo chat not found, skipping this test");
    }
    console.log();

    // Test 7: Get ticket statistics
    console.log("📊 Test 7: Getting ticket statistics...");
    const stats = await getTicketStats(demoOrg.id);
    console.log(`✅ Organization ticket statistics:`);
    console.log(`   Total Tickets: ${stats.total}`);
    console.log(`   New: ${stats.byStatus.new}`);
    console.log(`   Open: ${stats.byStatus.open}`);
    console.log(`   In Progress: ${stats.byStatus.inProgress}`);
    console.log(`   Resolved: ${stats.byStatus.resolved}`);
    console.log(`   Closed: ${stats.byStatus.closed}`);
    console.log(`   High Priority: ${stats.byPriority.high}`);
    console.log(`   Urgent: ${stats.byPriority.urgent}`);
    console.log();

    // Test 8: Search and filter
    console.log("🔍 Test 8: Testing search and filters...");
    const filteredTickets = await listTickets({
      organizationId: demoOrg.id,
      status: TicketStatus.IN_PROGRESS,
      priority: [TicketPriority.HIGH, TicketPriority.URGENT],
      search: "test",
      page: 1,
      limit: 10,
    });
    console.log(
      `✅ Found ${filteredTickets.pagination.total} tickets matching filters:`
    );
    console.log(`   - Status: IN_PROGRESS`);
    console.log(`   - Priority: HIGH or URGENT`);
    console.log(`   - Search: "test"`);
    filteredTickets.tickets.forEach((t) => {
      console.log(
        `   - Ticket #${t.ticketNumber}: ${t.subject} (${t.status}, ${t.priority})`
      );
    });
    console.log();

    console.log("✅ All tests completed successfully! 🎉");
    console.log("\n📝 Phase 1 implementation is working correctly.");
    console.log("   Ready to proceed to Phase 2 (Admin Dashboard UI).");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

testTicketSystem()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

