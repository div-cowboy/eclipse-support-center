/**
 * Utility for managing embed chat sessions in localStorage
 * Stores chat IDs and basic metadata for persistence across sessions
 */

export interface ChatSession {
  id: string;
  chatbotId: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  preview?: string; // Last message preview
}

const STORAGE_KEY = "eclipse_embed_chats";
const MAX_CHATS = 50; // Limit stored chats to prevent localStorage overflow

/**
 * Get all chat sessions from localStorage
 */
export function getChatSessions(chatbotId?: string): ChatSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const sessions: ChatSession[] = JSON.parse(stored);

    // Filter by chatbotId if provided
    if (chatbotId) {
      return sessions.filter((s) => s.chatbotId === chatbotId);
    }

    return sessions;
  } catch (error) {
    console.error("Error reading chat sessions from localStorage:", error);
    return [];
  }
}

/**
 * Get a specific chat session by ID
 */
export function getChatSession(chatId: string): ChatSession | null {
  const sessions = getChatSessions();
  return sessions.find((s) => s.id === chatId) || null;
}

/**
 * Save or update a chat session
 */
export function saveChatSession(session: ChatSession): void {
  try {
    const sessions = getChatSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      // Update existing session
      sessions[existingIndex] = session;
    } else {
      // Add new session
      sessions.unshift(session);

      // Limit to MAX_CHATS
      if (sessions.length > MAX_CHATS) {
        sessions.splice(MAX_CHATS);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving chat session to localStorage:", error);
  }
}

/**
 * Update chat session metadata (like lastMessageAt, messageCount, preview)
 */
export function updateChatSession(
  chatId: string,
  updates: Partial<Omit<ChatSession, "id" | "chatbotId">>
): void {
  const session = getChatSession(chatId);
  if (session) {
    saveChatSession({ ...session, ...updates });
  }
}

/**
 * Delete a chat session
 */
export function deleteChatSession(chatId: string): void {
  try {
    const sessions = getChatSessions();
    const filtered = sessions.filter((s) => s.id !== chatId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting chat session from localStorage:", error);
  }
}

/**
 * Clear all chat sessions (optionally for a specific chatbot)
 */
export function clearChatSessions(chatbotId?: string): void {
  try {
    if (chatbotId) {
      const sessions = getChatSessions();
      const filtered = sessions.filter((s) => s.chatbotId !== chatbotId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error clearing chat sessions from localStorage:", error);
  }
}

/**
 * Get the most recent chat session for a chatbot
 */
export function getMostRecentChat(chatbotId: string): ChatSession | null {
  const sessions = getChatSessions(chatbotId);
  if (sessions.length === 0) return null;

  // Sessions are already sorted by most recent first
  return sessions[0];
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

