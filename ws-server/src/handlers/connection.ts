import { WebSocket } from 'ws';
import { AuthenticatedWebSocket } from '../types';
import { logger } from '../utils/logger';

/**
 * Map of chat rooms to connected clients
 */
export const chatRooms = new Map<string, Set<AuthenticatedWebSocket>>();

/**
 * Add client to chat room
 */
export function addToRoom(ws: AuthenticatedWebSocket): void {
  const { chatId, userId } = ws;
  
  if (!chatRooms.has(chatId)) {
    chatRooms.set(chatId, new Set());
    logger.info(`Created new chat room: ${chatId}`);
  }
  
  chatRooms.get(chatId)!.add(ws);
  
  logger.info(`User ${userId} joined chat ${chatId}`, {
    roomSize: chatRooms.get(chatId)!.size,
  });
}

/**
 * Remove client from chat room
 */
export function removeFromRoom(ws: AuthenticatedWebSocket): void {
  const { chatId, userId } = ws;
  
  const room = chatRooms.get(chatId);
  if (!room) return;
  
  room.delete(ws);
  
  if (room.size === 0) {
    chatRooms.delete(chatId);
    logger.info(`Chat room ${chatId} is now empty, cleaning up`);
  } else {
    logger.info(`User ${userId} left chat ${chatId}`, {
      remainingClients: room.size,
    });
  }
}

/**
 * Broadcast message to all clients in a chat room
 */
export function broadcastToRoom(
  chatId: string,
  message: any,
  excludeWs?: WebSocket
): number {
  const room = chatRooms.get(chatId);
  if (!room) {
    logger.debug(`No room found for chatId: ${chatId}`);
    return 0;
  }
  
  const payload = JSON.stringify(message);
  let sentCount = 0;
  
  room.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send message to client in chat ${chatId}`, error);
      }
    }
  });
  
  logger.debug(`Broadcasted message to ${sentCount} clients in chat ${chatId}`, {
    messageType: message.type,
  });
  
  return sentCount;
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  chatRooms: Array<{ chatId: string; connections: number }>;
} {
  const chatRoomStats = Array.from(chatRooms.entries()).map(([chatId, clients]) => ({
    chatId: chatId.substring(0, 8) + '...', // Truncate for privacy
    connections: clients.size,
  }));
  
  const totalConnections = Array.from(chatRooms.values())
    .reduce((sum, clients) => sum + clients.size, 0);
  
  return {
    totalConnections,
    chatRooms: chatRoomStats,
  };
}

/**
 * Setup heartbeat for WebSocket
 */
export function setupHeartbeat(ws: AuthenticatedWebSocket): void {
  ws.isAlive = true;
  
  ws.on('pong', function heartbeat(this: AuthenticatedWebSocket) {
    this.isAlive = true;
  });
}

/**
 * Check for dead connections and terminate them
 */
export function checkHeartbeats(wss: any): void {
  wss.clients.forEach((ws: AuthenticatedWebSocket) => {
    if (!ws.isAlive) {
      logger.warn(`Terminating dead connection for user ${ws.userId} in chat ${ws.chatId}`);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}

