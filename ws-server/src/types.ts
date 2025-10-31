import { WebSocket } from "ws";

/**
 * Authenticated WebSocket with user metadata
 */
export interface AuthenticatedWebSocket extends WebSocket {
  chatId: string;
  userId: string;
  isAlive: boolean;
  metadata?: {
    connectedAt: Date;
    lastActivity: Date;
  };
}

/**
 * JWT token payload
 */
export interface JWTPayload {
  userId: string;
  chatId: string;
  isAuthenticated?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * WebSocket message types
 */
export type WSMessageType = "message" | "typing" | "agent_joined" | "ping";

/**
 * Incoming WebSocket message
 */
export interface IncomingWSMessage {
  type: WSMessageType;
  content?: string;
  role?: "USER" | "ASSISTANT" | "AGENT";
  isTyping?: boolean;
  agentId?: string;
  agentName?: string;
}

/**
 * Outgoing WebSocket message
 */
export interface OutgoingWSMessage {
  type: "connected" | "message" | "typing" | "agent_joined" | "error" | "pong";
  chatId?: string;
  timestamp?: string;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Saved message from database
 */
export interface SavedMessage {
  id: string;
  content: string;
  role: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
  };
}

/**
 * Redis pub/sub message
 */
export interface RedisMessage {
  type: WSMessageType | "agent_joined";
  chatId: string;
  data: any;
  timestamp: string;
}

/**
 * Server statistics
 */
export interface ServerStats {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  connections: {
    total: number;
    byChat: Array<{ chatId: string; count: number }>;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  timestamp: string;
}
