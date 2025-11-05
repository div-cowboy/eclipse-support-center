/**
 * Form Security Utilities
 * CSRF protection, input sanitization, and security validation
 */

import crypto from "crypto";

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Basic HTML entity encoding for common XSS vectors
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  // Limit length (10,000 characters for text fields)
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes and trim
  let sanitized = input.replace(/\0/g, "").trim();

  // Limit length (254 characters per RFC 5321)
  if (sanitized.length > 254) {
    sanitized = sanitized.substring(0, 254);
  }

  return sanitized;
}

/**
 * Sanitize form data object
 */
export function sanitizeFormData(
  formData: Record<string, any>,
  fieldTypes: Record<string, string>
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(formData)) {
    // Skip system fields (they'll be validated separately)
    if (key.startsWith("_")) {
      continue;
    }

    // Skip if value is null/undefined
    if (value === null || value === undefined) {
      continue;
    }

    const fieldType = fieldTypes[key] || "text";

    if (typeof value === "string") {
      if (fieldType === "email") {
        sanitized[key] = sanitizeEmail(value);
      } else {
        sanitized[key] = sanitizeString(value);
      }
    } else if (typeof value === "number") {
      // Validate number is finite
      sanitized[key] = isFinite(value) ? value : 0;
    } else if (typeof value === "boolean") {
      sanitized[key] = Boolean(value);
    } else if (Array.isArray(value)) {
      // Sanitize array elements
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item
      );
    } else {
      // For other types, convert to string and sanitize
      sanitized[key] = sanitizeString(String(value));
    }
  }

  return sanitized;
}

/**
 * Validate field name (whitelist approach)
 */
export function isValidFieldName(name: string): boolean {
  // Only allow alphanumeric, underscore, and hyphen
  // Must not start with underscore (reserved for system fields)
  if (!name || name.startsWith("_")) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Validate honeypot fields
 */
export function validateHoneypot(formData: Record<string, any>): {
  valid: boolean;
  triggered: string[];
} {
  const triggered: string[] = [];

  // Check timestamp honeypot
  const timestamp = formData._form_timestamp;
  if (!timestamp) {
    // Missing timestamp = likely bot (no JS execution)
    triggered.push("timestamp_missing");
  } else {
    const loadTime = parseInt(timestamp, 10);
    const now = Date.now();
    const timeDiff = now - loadTime;

    // If submitted too quickly (< 3 seconds), likely a bot
    if (timeDiff < 3000) {
      triggered.push("timestamp_too_fast");
    }

    // If submitted too late (> 30 minutes), likely stale
    if (timeDiff > 30 * 60 * 1000) {
      triggered.push("timestamp_too_old");
    }
  }

  // Check field name honeypot (common bot targets)
  const honeypotFields = ["website", "url", "homepage", "link"];
  for (const field of honeypotFields) {
    if (formData[field] && formData[field] !== "") {
      triggered.push(`honeypot_${field}`);
    }
  }

  return {
    valid: triggered.length === 0,
    triggered,
  };
}

/**
 * Validate origin header
 */
export function validateOrigin(
  origin: string | null,
  referer: string | null,
  allowedDomains: string[]
): boolean {
  // If no origin/referer, allow (for iframe embeds)
  if (!origin && !referer) {
    return true;
  }

  // Check origin header
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.hostname;

      // Check against allowed domains
      for (const domain of allowedDomains) {
        if (originHost === domain || originHost.endsWith(`.${domain}`)) {
          return true;
        }
      }
    } catch {
      // Invalid origin URL
      return false;
    }
  }

  // Check referer header as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHost = refererUrl.hostname;

      for (const domain of allowedDomains) {
        if (refererHost === domain || refererHost.endsWith(`.${domain}`)) {
          return true;
        }
      }
    } catch {
      // Invalid referer URL
      return false;
    }
  }

  // If we have origin/referer but it doesn't match, reject
  return false;
}

/**
 * Hash IP address for privacy (one-way hash)
 */
export function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

