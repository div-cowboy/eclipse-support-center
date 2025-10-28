/**
 * EventEmitter class for real-time communication
 * Mimics Supabase's real-time functionality for local development
 */

export class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  /**
   * Subscribe to an event
   */
  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Broadcast an event to all subscribers
   */
  emit(event: string, data: any): void {
    if (this.events[event]) {
      this.events[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: Function): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.events[event] ? this.events[event].length : 0;
  }
}

// Global event emitter instance
export const globalEventEmitter = new EventEmitter();
