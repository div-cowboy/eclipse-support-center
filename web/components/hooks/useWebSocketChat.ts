import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Message structure for WebSocket chat
 */
export interface WebSocketChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "agent" | "system";
  timestamp: Date;
  sender: {
    id: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
  };
}

/**
 * WebSocket message types
 */
export type WSMessageType =
  | "connected"
  | "message"
  | "message_updated"
  | "typing"
  | "agent_joined"
  | "error"
  | "pong";

interface UseWebSocketChatOptions {
  chatId: string;
  enabled: boolean;
  onMessage?: (message: WebSocketChatMessage) => void;
  onMessageUpdated?: (message: {
    id: string;
    content: string;
    role: "user" | "assistant" | "agent" | "system";
    timestamp: Date;
    updatedAt: Date;
    sender: {
      id: string;
      name: string;
      email?: string | null;
      avatar?: string | null;
    };
  }) => void;
  onAgentJoined?: (agent: {
    agentId: string;
    agentName: string;
    timestamp: Date;
  }) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseWebSocketChatReturn {
  sendMessage: (
    content: string,
    role: "USER" | "ASSISTANT" | "AGENT"
  ) => Promise<boolean>;
  sendTypingIndicator: (isTyping: boolean) => void;
  broadcastAgentJoined: (agentId: string, agentName: string) => void;
  isConnected: boolean;
  error: string | null;
}

/**
 * Custom WebSocket Chat Hook
 * Connects to our custom WebSocket server instead of Supabase Realtime
 */
export function useWebSocketChat({
  chatId,
  enabled,
  onMessage,
  onMessageUpdated,
  onAgentJoined,
  onTyping,
  onError,
  onConnected,
  onDisconnected,
}: UseWebSocketChatOptions): UseWebSocketChatReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  // Use refs for callbacks to avoid re-subscribing on every render
  const onMessageRef = useRef(onMessage);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onAgentJoinedRef = useRef(onAgentJoined);
  const onTypingRef = useRef(onTyping);
  const onErrorRef = useRef(onError);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onMessageUpdatedRef.current = onMessageUpdated;
    onAgentJoinedRef.current = onAgentJoined;
    onTypingRef.current = onTyping;
    onErrorRef.current = onError;
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
  }, [
    onMessage,
    onMessageUpdated,
    onAgentJoined,
    onTyping,
    onError,
    onConnected,
    onDisconnected,
  ]);

  // Connect to WebSocket server
  useEffect(() => {
    if (!enabled || !chatId) {
      console.log(`[useWebSocketChat] Not connecting`, { enabled, chatId });
      return;
    }

    let isMounted = true;

    async function connect() {
      try {
        console.log(
          `[useWebSocketChat] Fetching WebSocket token for chat:${chatId}`
        );

        // Get authentication token from API
        const response = await fetch(`/api/ws/token?chatId=${chatId}`);

        if (!response.ok) {
          throw new Error(`Failed to get WebSocket token: ${response.status}`);
        }

        const { token, wsUrl } = await response.json();

        if (!isMounted) return;

        console.log(`[useWebSocketChat] Connecting to ${wsUrl}`);

        // Connect to WebSocket server
        const ws = new WebSocket(`${wsUrl}?token=${token}`);

        ws.onopen = () => {
          if (!isMounted) return;

          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0;

          console.log(`[useWebSocketChat] ✅ Connected to chat:${chatId}`);
          onConnectedRef.current?.();
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const message = JSON.parse(event.data);

            console.log(`[useWebSocketChat] Received message:`, {
              type: message.type,
              chatId,
            });

            switch (message.type) {
              case "connected":
                console.log(
                  `[useWebSocketChat] Connection confirmed by server`
                );
                break;

              case "message":
                if (onMessageRef.current && message.data) {
                  onMessageRef.current({
                    id: message.data.id,
                    content: message.data.content,
                    role: message.data.role,
                    timestamp: new Date(message.data.timestamp),
                    sender: message.data.sender,
                  });
                }
                break;

              case "message_updated":
                if (onMessageUpdatedRef.current && message.data) {
                  onMessageUpdatedRef.current({
                    id: message.data.id,
                    content: message.data.content,
                    role: message.data.role,
                    timestamp: new Date(message.data.timestamp),
                    updatedAt: new Date(message.data.updatedAt),
                    sender: message.data.sender,
                  });
                }
                break;

              case "agent_joined":
                if (onAgentJoinedRef.current && message.data) {
                  console.log(
                    `[useWebSocketChat] 🎉 Agent joined:`,
                    message.data
                  );
                  onAgentJoinedRef.current({
                    agentId: message.data.agentId,
                    agentName: message.data.agentName,
                    timestamp: new Date(message.data.timestamp),
                  });
                }
                break;

              case "typing":
                if (onTypingRef.current && message.data) {
                  onTypingRef.current(
                    message.data.userId,
                    message.data.isTyping
                  );
                }
                break;

              case "error":
                const errorMsg =
                  message.error || message.message || "Unknown error";
                console.error(`[useWebSocketChat] Server error:`, errorMsg);
                setError(errorMsg);
                onErrorRef.current?.(errorMsg);
                break;

              case "pong":
                // Heartbeat response
                break;

              default:
                console.warn(
                  `[useWebSocketChat] Unknown message type:`,
                  message.type
                );
            }
          } catch (err) {
            console.error("[useWebSocketChat] Error parsing message:", err);
          }
        };

        ws.onerror = (event) => {
          console.error("[useWebSocketChat] WebSocket error:", event);
          setError("WebSocket connection error");
        };

        ws.onclose = (event) => {
          if (!isMounted) return;

          setIsConnected(false);
          console.log(
            `[useWebSocketChat] Disconnected (code: ${event.code}, reason: ${event.reason})`
          );
          onDisconnectedRef.current?.();

          // Exponential backoff reconnection
          if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              30000
            );
            console.log(
              `[useWebSocketChat] Reconnecting in ${delay}ms (attempt ${
                reconnectAttempts.current + 1
              }/${maxReconnectAttempts})`
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttempts.current++;
              connect();
            }, delay);
          } else if (reconnectAttempts.current >= maxReconnectAttempts) {
            const errorMsg = "Failed to reconnect after multiple attempts";
            console.error(`[useWebSocketChat] ${errorMsg}`);
            setError(errorMsg);
            onErrorRef.current?.(errorMsg);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.error("[useWebSocketChat] Connection error:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to connect to chat server";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
      }
    }

    connect();

    return () => {
      isMounted = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        console.log(
          `[useWebSocketChat] Cleaning up connection for chat:${chatId}`
        );
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [enabled, chatId]);

  // Send chat message
  const sendMessage = useCallback(
    async (
      content: string,
      role: "USER" | "ASSISTANT" | "AGENT"
    ): Promise<boolean> => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const errorMsg = "Not connected to chat server";
        console.error(`[useWebSocketChat] ${errorMsg}`);
        setError(errorMsg);
        return false;
      }

      if (!content.trim()) {
        console.warn("[useWebSocketChat] Attempted to send empty message");
        return false;
      }

      try {
        const message = {
          type: "message",
          content: content.trim(),
          role,
        };

        console.log(`[useWebSocketChat] Sending message:`, {
          role,
          length: content.length,
        });
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (err) {
        console.error("[useWebSocketChat] Error sending message:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMsg);
        return false;
      }
    },
    []
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          isTyping,
        })
      );
    } catch (err) {
      console.error("[useWebSocketChat] Error sending typing indicator:", err);
    }
  }, []);

  // Broadcast agent joined event
  const broadcastAgentJoined = useCallback(
    (agentId: string, agentName: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn(
          "[useWebSocketChat] Cannot broadcast agent_joined: not connected"
        );
        return;
      }

      try {
        console.log(`[useWebSocketChat] Broadcasting agent_joined:`, {
          agentId,
          agentName,
        });
        wsRef.current.send(
          JSON.stringify({
            type: "agent_joined",
            agentId,
            agentName,
          })
        );
      } catch (err) {
        console.error(
          "[useWebSocketChat] Error broadcasting agent_joined:",
          err
        );
      }
    },
    []
  );

  return {
    sendMessage,
    sendTypingIndicator,
    broadcastAgentJoined,
    isConnected,
    error,
  };
}
