/**
 * Environment Variable Validation
 * 
 * Provides validation and helpful error messages for required environment variables
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables for WebSocket functionality
 */
export function validateWebSocketEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required variables
  const required = {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
  };

  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      errors.push(
        `Missing required environment variable: ${key}\n` +
        `  → Add this to your .env.local file\n` +
        `  → See .env.local.example for reference`
      );
    }
  }

  // Validate WebSocket URL format
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl) {
    const isLocal = wsUrl.startsWith("ws://localhost") || wsUrl.startsWith("ws://127.0.0.1");
    const isProduction = wsUrl.startsWith("wss://");
    const isLocalSecure = wsUrl.startsWith("ws://");

    if (!isLocal && !isProduction && !isLocalSecure) {
      warnings.push(
        `NEXT_PUBLIC_WS_URL format may be incorrect: ${wsUrl}\n` +
        `  → Use ws://localhost:8080 for local development\n` +
        `  → Use wss://your-server.fly.dev for production`
      );
    }

    if (process.env.NODE_ENV === "production" && !isProduction) {
      warnings.push(
        `Production environment detected but using non-secure WebSocket URL\n` +
        `  → Use wss:// (secure) instead of ws:// in production`
      );
    }
  }

  // Validate secrets are not placeholder values
  if (process.env.JWT_SECRET === "your-jwt-secret-here") {
    errors.push(
      `JWT_SECRET is set to placeholder value\n` +
      `  → Generate a secure secret: openssl rand -hex 32\n` +
      `  → Update .env.local with the generated value`
    );
  }

  if (process.env.INTERNAL_API_SECRET === "your-internal-api-secret-here") {
    errors.push(
      `INTERNAL_API_SECRET is set to placeholder value\n` +
      `  → Generate a secure secret: openssl rand -hex 32\n` +
      `  → Update .env.local with the generated value`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Redis configuration
 */
export function validateRedisEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) {
    errors.push(
      `Missing Redis configuration\n` +
      `  → UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required\n` +
      `  → Get these from your Upstash dashboard under "REST API" tab`
    );
  } else {
    // Validate URL format
    if (!restUrl.startsWith("https://")) {
      warnings.push(
        `UPSTASH_REDIS_REST_URL should start with https://\n` +
        `  → Current value: ${restUrl}`
      );
    }

    // Check for placeholder values
    if (restUrl.includes("your-redis-name") || restToken.includes("your-upstash")) {
      errors.push(
        `Redis configuration contains placeholder values\n` +
        `  → Update UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate database configuration
 */
export function validateDatabaseEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    errors.push(
      `Missing DATABASE_URL\n` +
      `  → Required for Prisma database connection\n` +
      `  → Format: postgresql://user:password@host:port/dbname`
    );
  } else {
    // Check for placeholder values
    if (databaseUrl.includes("your-password") || databaseUrl.includes("localhost:5432/eclipse_support")) {
      warnings.push(
        `DATABASE_URL appears to contain placeholder values\n` +
        `  → Update with your actual database credentials`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all environment variables
 */
export function validateAllEnv(): ValidationResult {
  const wsResult = validateWebSocketEnv();
  const redisResult = validateRedisEnv();
  const dbResult = validateDatabaseEnv();

  return {
    valid: wsResult.valid && redisResult.valid && dbResult.valid,
    errors: [...wsResult.errors, ...redisResult.errors, ...dbResult.errors],
    warnings: [...wsResult.warnings, ...redisResult.warnings, ...dbResult.warnings],
  };
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  if (result.errors.length > 0) {
    console.error("\n❌ Environment Variable Validation Failed:\n");
    result.errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}\n`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  Environment Variable Warnings:\n");
    result.warnings.forEach((warning, index) => {
      console.warn(`${index + 1}. ${warning}\n`);
    });
  }

  if (result.valid && result.warnings.length === 0) {
    console.log("✅ All environment variables validated successfully");
  }
}

