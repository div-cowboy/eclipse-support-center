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
      systemPrompt:
        "You are a helpful AI assistant for Eclipse Support Center. Be friendly, professional, and concise. Help users with their questions about the platform.",
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

  console.log("\n✅ Seed data created successfully!");
  console.log("\n📝 Demo Chatbot Details:");
  console.log(`   - Chatbot ID: ${demoChatbot.id}`);
  console.log(`   - Name: ${demoChatbot.name}`);
  console.log(`   - Organization: ${demoOrg.name}`);
  console.log(`   - Status: ${demoChatbot.status}`);
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
