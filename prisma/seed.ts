import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a sample user
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
    },
  });

  console.log("Created user:", user.email);

  // Create a demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      name: "Eclipse Support Center",
      slug: "eclipse-demo",
      description:
        "Demo organization for Eclipse Support Center. This is a sample organization that showcases the AI-powered support chatbot capabilities.",
      users: {
        connect: { id: user.id },
      },
    },
  });

  console.log("Created organization:", demoOrg.name);

  // Create a demo chatbot
  const demoChatbot = await prisma.chatbot.upsert({
    where: { id: "demo" },
    update: {},
    create: {
      id: "demo",
      name: "Eclipse Demo Assistant",
      description:
        "I'm a demo AI assistant for Eclipse Support Center. I can help answer questions and provide support!",
      status: "ACTIVE",
      config: {
        systemPrompt:
          "You are a helpful AI assistant for Eclipse Support Center. Be friendly, professional, and concise. Help users with their questions about the platform.",
      },
      organizationId: demoOrg.id,
    },
  });

  console.log("Created chatbot:", demoChatbot.name);

  // Create sample context blocks for the demo chatbot
  await prisma.contextBlock.upsert({
    where: { id: "demo-context-1" },
    update: {},
    create: {
      id: "demo-context-1",
      title: "About Eclipse Support Center",
      content:
        "Eclipse Support Center is an AI-powered customer support platform that helps organizations provide instant, intelligent assistance to their users. Features include: AI chatbots with custom knowledge bases, document search and retrieval, contextual responses based on your organization's data, seamless embedding options for websites and apps.",
      type: "DOCUMENTATION",
      chatbotId: demoChatbot.id,
    },
  });

  await prisma.contextBlock.upsert({
    where: { id: "demo-context-2" },
    update: {},
    create: {
      id: "demo-context-2",
      title: "Getting Started",
      content:
        "To get started with Eclipse Support Center: 1. Create an organization, 2. Set up your first chatbot, 3. Add context blocks with your knowledge base, 4. Embed the chatbot on your website using iframe or JavaScript widget, 5. Monitor conversations and improve responses over time.",
      type: "TUTORIAL",
      chatbotId: demoChatbot.id,
    },
  });

  await prisma.contextBlock.upsert({
    where: { id: "demo-context-3" },
    update: {},
    create: {
      id: "demo-context-3",
      title: "FAQ - How does it work?",
      content:
        "The chatbot uses advanced AI to understand user questions and provide relevant answers based on your organization's knowledge base. It searches through documents, context blocks, and previous conversations to find the most helpful information.",
      type: "FAQ",
      chatbotId: demoChatbot.id,
    },
  });

  console.log("Created sample context blocks");

  // Create a demo chat for ticket testing
  const demoChat = await prisma.chat.upsert({
    where: { id: "demo-chat-1" },
    update: {},
    create: {
      id: "demo-chat-1",
      title: "Help with login issue",
      description: "Customer having trouble logging in",
      status: "ACTIVE",
      escalationRequested: true,
      escalationReason: "Technical issue requiring investigation",
      chatbotId: demoChatbot.id,
      assignedToId: user.id,
    },
  });

  // Add messages to the demo chat
  await prisma.message.create({
    data: {
      content: "Hi, I'm having trouble logging into my account. I keep getting an error message.",
      role: "USER",
      chatId: demoChat.id,
      userId: user.id,
    },
  });

  await prisma.message.create({
    data: {
      content: "I'm sorry to hear that. Can you tell me what error message you're seeing?",
      role: "ASSISTANT",
      chatId: demoChat.id,
    },
  });

  await prisma.message.create({
    data: {
      content: "It says 'Invalid credentials' but I know my password is correct. I even tried resetting it.",
      role: "USER",
      chatId: demoChat.id,
      userId: user.id,
    },
  });

  console.log("Created demo chat with messages");

  // Create sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      subject: "Cannot access billing dashboard",
      description: "Customer reported they cannot access the billing section after the latest update. Attempted clearing cache and cookies without success.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "Technical",
      organizationId: demoOrg.id,
      requesterName: "John Smith",
      requesterEmail: "john.smith@example.com",
      requesterId: user.id,
      assignedToId: user.id,
      tags: ["billing", "access-issue", "urgent"],
      metadata: {
        source: "manual",
        browser: "Chrome 118",
        os: "Windows 11",
      },
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      subject: "Feature request: Dark mode",
      description: "Customer requested a dark mode option for the dashboard. Multiple users have asked for this feature.",
      status: "NEW",
      priority: "LOW",
      category: "Feature Request",
      organizationId: demoOrg.id,
      requesterName: "Sarah Johnson",
      requesterEmail: "sarah.j@example.com",
      tags: ["feature-request", "ui"],
      metadata: {
        source: "manual",
      },
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      subject: "Login issue - escalated from chat",
      description: `--- Chat Transcript ---

[Nov 02, 2025 10:30] Customer: Hi, I'm having trouble logging into my account. I keep getting an error message.
[Nov 02, 2025 10:31] Bot: I'm sorry to hear that. Can you tell me what error message you're seeing?
[Nov 02, 2025 10:32] Customer: It says 'Invalid credentials' but I know my password is correct. I even tried resetting it.

--- End of Transcript ---`,
      status: "OPEN",
      priority: "HIGH",
      category: "Technical",
      organizationId: demoOrg.id,
      requesterName: "Test User",
      requesterEmail: "test@example.com",
      requesterId: user.id,
      assignedToId: user.id,
      tags: ["escalated-from-chat", "login", "authentication"],
      originChatId: demoChat.id,
      metadata: {
        source: "chat",
        chatId: demoChat.id,
        escalationRequested: true,
        escalationReason: "Technical issue requiring investigation",
      },
    },
  });

  console.log("Created sample tickets");

  // Create responses for ticket 1
  await prisma.ticketResponse.create({
    data: {
      content: "Hi John, I've looked into this issue. It appears there was a permissions error after the update. I'm working with our dev team to resolve it.",
      isInternal: false,
      authorId: user.id,
      authorEmail: user.email,
      authorName: user.name || "Support Agent",
      authorType: "AGENT",
      ticketId: ticket1.id,
    },
  });

  await prisma.ticketResponse.create({
    data: {
      content: "Internal note: This affects all users who had custom billing roles. Need to run migration script.",
      isInternal: true,
      authorId: user.id,
      authorEmail: user.email,
      authorName: user.name || "Support Agent",
      authorType: "AGENT",
      ticketId: ticket1.id,
    },
  });

  console.log("Created sample ticket responses");

  // Create activities for tickets
  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket1.id,
      activityType: "CREATED",
      description: "Ticket created",
      performedById: user.id,
      performedByName: user.name || "System",
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket1.id,
      activityType: "ASSIGNED",
      description: `Ticket assigned to ${user.name || "agent"}`,
      performedById: user.id,
      performedByName: user.name || "System",
      changes: {
        assignedToId: { from: null, to: user.id },
      },
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket1.id,
      activityType: "STATUS_CHANGED",
      description: "Status changed from NEW to IN_PROGRESS",
      performedById: user.id,
      performedByName: user.name || "System",
      changes: {
        status: { from: "NEW", to: "IN_PROGRESS" },
      },
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket3.id,
      activityType: "CREATED",
      description: "Ticket created from chat",
      performedById: user.id,
      performedByName: user.name || "System",
    },
  });

  console.log("Created sample ticket activities");

  console.log("\n✅ Seed data created successfully!");
  console.log("\n📝 Demo Chatbot Details:");
  console.log(`   - Chatbot ID: ${demoChatbot.id}`);
  console.log(`   - Name: ${demoChatbot.name}`);
  console.log(`   - Organization: ${demoOrg.name}`);
  console.log(`   - Status: ${demoChatbot.status}`);
  console.log(`\n🎫 Demo Tickets Created:`);
  console.log(`   - Ticket #${ticket1.ticketNumber}: ${ticket1.subject}`);
  console.log(`   - Ticket #${ticket2.ticketNumber}: ${ticket2.subject}`);
  console.log(`   - Ticket #${ticket3.ticketNumber}: ${ticket3.subject} (from chat)`);
  console.log(`\n🔗 Use this in your iframe:`);
  console.log(`   /embed/chat?chatbotId=${demoChatbot.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
