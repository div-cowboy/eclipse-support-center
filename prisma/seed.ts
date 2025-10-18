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

  // Create a sample post
  await prisma.post.upsert({
    where: { id: "sample-post-1" },
    update: {},
    create: {
      id: "sample-post-1",
      title: "Welcome to Eclipse Support Center",
      content: "This is a sample post to get you started.",
      published: true,
      authorId: user.id,
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
