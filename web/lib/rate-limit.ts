/**
 * Rate Limiting Service
 * In-memory rate limiting for MVP (can be upgraded to Redis for production)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request exceeds the rate limit
   * @param key - Unique identifier (e.g., "ip:xxx" or "form:xxx:ip:xxx")
   * @param limit - Maximum number of requests
   * @param windowSeconds - Time window in seconds
   * @returns Object with limit status and remaining requests
   */
  check(
    key: string,
    limit: number,
    windowSeconds: number
  ): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const resetAt = now + windowSeconds * 1000;

    const entry = this.store.get(key);

    if (!entry) {
      // First request
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      };
    }

    // Check if window has expired
    if (now >= entry.resetAt) {
      // Reset window
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      };
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a key (useful for testing)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Shutdown cleanup interval
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Try various headers (respects proxies)
  const headers = {
    "x-forwarded-for": request.headers.get("x-forwarded-for"),
    "x-real-ip": request.headers.get("x-real-ip"),
    "cf-connecting-ip": request.headers.get("cf-connecting-ip"), // Cloudflare
  };

  // Get first valid IP from x-forwarded-for (may contain multiple IPs)
  if (headers["x-forwarded-for"]) {
    const ips = headers["x-forwarded-for"].split(",").map((ip) => ip.trim());
    return ips[0] || "unknown";
  }

  // Fallback to other headers
  return (
    headers["x-real-ip"] || headers["cf-connecting-ip"] || "unknown"
  );
}

/**
 * Rate limit check for form submissions
 * Multi-layer rate limiting:
 * 1. Per IP address
 * 2. Per form embed code
 * 3. Per organization
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: "ip" | "form" | "organization" | "global";
  remaining?: number;
  resetAt?: number;
  retryAfter?: number;
}

export async function checkFormSubmissionRateLimit(
  ip: string,
  embedCode: string,
  organizationId: string
): Promise<RateLimitResult> {
  // Layer 1: Per IP Address
  // 5 submissions per 15 minutes
  const ipKey15m = `form:ip:${ip}:15m`;
  const ipCheck15m = rateLimiter.check(ipKey15m, 5, 15 * 60);
  if (!ipCheck15m.allowed) {
    return {
      allowed: false,
      reason: "ip",
      remaining: ipCheck15m.remaining,
      resetAt: ipCheck15m.resetAt,
      retryAfter: ipCheck15m.retryAfter,
    };
  }

  // 20 submissions per hour
  const ipKey1h = `form:ip:${ip}:1h`;
  const ipCheck1h = rateLimiter.check(ipKey1h, 20, 60 * 60);
  if (!ipCheck1h.allowed) {
    return {
      allowed: false,
      reason: "ip",
      remaining: ipCheck1h.remaining,
      resetAt: ipCheck1h.resetAt,
      retryAfter: ipCheck1h.retryAfter,
    };
  }

  // 100 submissions per day
  const ipKey24h = `form:ip:${ip}:24h`;
  const ipCheck24h = rateLimiter.check(ipKey24h, 100, 24 * 60 * 60);
  if (!ipCheck24h.allowed) {
    return {
      allowed: false,
      reason: "ip",
      remaining: ipCheck24h.remaining,
      resetAt: ipCheck24h.resetAt,
      retryAfter: ipCheck24h.retryAfter,
    };
  }

  // Layer 2: Per Form Embed Code
  // 10 submissions per minute
  const formKey1m = `form:embed:${embedCode}:1m`;
  const formCheck1m = rateLimiter.check(formKey1m, 10, 60);
  if (!formCheck1m.allowed) {
    return {
      allowed: false,
      reason: "form",
      remaining: formCheck1m.remaining,
      resetAt: formCheck1m.resetAt,
      retryAfter: formCheck1m.retryAfter,
    };
  }

  // 50 submissions per hour
  const formKey1h = `form:embed:${embedCode}:1h`;
  const formCheck1h = rateLimiter.check(formKey1h, 50, 60 * 60);
  if (!formCheck1h.allowed) {
    return {
      allowed: false,
      reason: "form",
      remaining: formCheck1h.remaining,
      resetAt: formCheck1h.resetAt,
      retryAfter: formCheck1h.retryAfter,
    };
  }

  // Layer 3: Per Organization
  // 1000 submissions per day
  const orgKey24h = `form:org:${organizationId}:24h`;
  const orgCheck24h = rateLimiter.check(orgKey24h, 1000, 24 * 60 * 60);
  if (!orgCheck24h.allowed) {
    return {
      allowed: false,
      reason: "organization",
      remaining: orgCheck24h.remaining,
      resetAt: orgCheck24h.resetAt,
      retryAfter: orgCheck24h.retryAfter,
    };
  }

  // All checks passed
  return {
    allowed: true,
  };
}

// Export for testing
export { rateLimiter };

