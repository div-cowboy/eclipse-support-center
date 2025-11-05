import { prisma } from "./prisma";

/**
 * Convert a temporary anonymous user to a real authenticated user
 * Links all chat history, messages, and other data
 *
 * @param tempUserId - The ID of the temporary user (from anon_* session)
 * @param realUserId - The ID of the real authenticated user
 * @returns Updated counts of linked records
 */
export async function convertTemporaryUser(
  tempUserId: string,
  realUserId: string
) {
  console.log(
    `🔄 Converting temporary user ${tempUserId} to real user ${realUserId}`
  );

  // Update all messages to point to real user
  const messagesResult = await prisma.message.updateMany({
    where: { userId: tempUserId },
    data: { userId: realUserId },
  });

  // Update any assigned chats
  const chatsResult = await prisma.chat.updateMany({
    where: { assignedToId: tempUserId },
    data: { assignedToId: realUserId },
  });

  // Delete the temporary user record
  await prisma.user.delete({
    where: { id: tempUserId },
  });

  console.log(`✅ Conversion complete:`, {
    messagesLinked: messagesResult.count,
    chatsLinked: chatsResult.count,
  });

  return {
    messagesLinked: messagesResult.count,
    chatsLinked: chatsResult.count,
  };
}

/**
 * Get or create a temporary user for an anonymous session
 *
 * @param anonymousSessionId - The anonymous session ID (e.g., "anon_1730401234_abc123")
 * @returns User ID
 */
export async function getOrCreateAnonymousUser(
  anonymousSessionId: string
): Promise<string> {
  const tempEmail = `${anonymousSessionId}@anonymous.temp`;

  // Try to find existing temporary user
  let tempUser = await prisma.user.findUnique({
    where: { email: tempEmail },
    select: { id: true },
  });

  // Create if doesn't exist
  if (!tempUser) {
    tempUser = await prisma.user.create({
      data: {
        email: tempEmail,
        name: "Anonymous User",
        // No emailVerified - indicates temporary account
      },
      select: { id: true },
    });

    console.log(
      `📝 Created temporary user: ${tempUser.id} for session ${anonymousSessionId}`
    );
  }

  return tempUser.id;
}

/**
 * Check if a user is temporary (anonymous)
 *
 * @param userId - User ID to check
 * @returns True if user is temporary
 */
export async function isTemporaryUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true },
  });

  if (!user) return false;

  // Temporary users have emails ending in @anonymous.temp and no emailVerified
  return user.email.endsWith("@anonymous.temp") && !user.emailVerified;
}

/**
 * Clean up old temporary users (older than 30 days with no activity)
 * Run this periodically as a cron job
 */
export async function cleanupOldTemporaryUsers() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find temporary users with no recent messages
  const oldTempUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: "@anonymous.temp" },
      emailVerified: null,
      updatedAt: { lt: thirtyDaysAgo },
    },
    select: { id: true },
  });

  let deleted = 0;
  for (const user of oldTempUsers) {
    // Check if they have any messages
    const messageCount = await prisma.message.count({
      where: { userId: user.id },
    });

    // Only delete if no messages (inactive)
    if (messageCount === 0) {
      await prisma.user.delete({ where: { id: user.id } });
      deleted++;
    }
  }

  console.log(`🧹 Cleaned up ${deleted} old temporary users`);
  return deleted;
}
