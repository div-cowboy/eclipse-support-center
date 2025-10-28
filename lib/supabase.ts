/**
 * Mock Supabase client that provides the same API as the real Supabase client
 * Uses our EventEmitter for real-time communication
 */

import { globalEventEmitter } from "./event-emitter";

export interface RealtimeChannel {
  channelName: string;
  callbacks: Map<string, Function>;
  isSubscribed: boolean;

  on(
    type: string,
    event: { event: string },
    callback: Function
  ): RealtimeChannel;
  send(payload: any): Promise<void>;
  subscribe(): RealtimeChannel;
  unsubscribe(): Promise<void>;
}

export interface SupabaseClient {
  channel(channelName: string): RealtimeChannel;
}

class MockRealtimeChannel implements RealtimeChannel {
  public channelName: string;
  public callbacks: Map<string, Function> = new Map();
  public isSubscribed: boolean = false;

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  on(
    type: string,
    event: { event: string },
    callback: Function
  ): RealtimeChannel {
    const eventKey = `${this.channelName}:${event.event}`;
    this.callbacks.set(eventKey, callback);
    return this;
  }

  async send(payload: any): Promise<void> {
    const eventKey = `${this.channelName}:${payload.event}`;

    // Emit the event to all subscribers
    globalEventEmitter.emit(eventKey, payload);

    // Also emit a general channel event for debugging
    globalEventEmitter.emit(`channel:${this.channelName}`, payload);

    console.log(`[MockSupabase] Broadcasting to ${this.channelName}:`, payload);
  }

  subscribe(): RealtimeChannel {
    this.isSubscribed = true;

    // Set up listeners for all registered callbacks
    this.callbacks.forEach((callback, eventKey) => {
      globalEventEmitter.on(eventKey, callback);
    });

    console.log(`[MockSupabase] Subscribed to channel: ${this.channelName}`);
    return this;
  }

  async unsubscribe(): Promise<void> {
    this.isSubscribed = false;

    // Remove all listeners for this channel
    this.callbacks.forEach((callback, eventKey) => {
      globalEventEmitter.off(eventKey, callback);
    });

    this.callbacks.clear();
    console.log(
      `[MockSupabase] Unsubscribed from channel: ${this.channelName}`
    );
  }
}

class MockSupabaseClient implements SupabaseClient {
  private channels: Map<string, MockRealtimeChannel> = new Map();

  channel(channelName: string): RealtimeChannel {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new MockRealtimeChannel(channelName));
    }
    return this.channels.get(channelName)!;
  }

  // Clean up method for testing
  cleanup(): void {
    this.channels.forEach((channel) => {
      if (channel.isSubscribed) {
        channel.unsubscribe();
      }
    });
    this.channels.clear();
  }
}

// Export the mock Supabase client
export const supabase: SupabaseClient = new MockSupabaseClient();

// Export types for use in components
export type { RealtimeChannel, SupabaseClient };
