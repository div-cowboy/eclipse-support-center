# Development Environment Setup Guide

This guide will help you set up your local development environment for the Eclipse Support Center application.

## Overview

The application consists of two main services:
1. **Next.js Application** (`web/`) - Main application server
2. **WebSocket Server** (`ws-server/`) - Real-time WebSocket server for chat functionality

Both services need to be configured with matching secrets and proper environment variables.

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script to automatically configure your environment:

```bash
./scripts/setup-dev-env.sh
```

The script will:
- Create `.env` files from `.env.example` templates
- Generate secure secrets if needed
- Validate your configuration
- Provide next steps

### Option 2: Manual Setup

1. **Copy environment templates:**
   ```bash
   # WebSocket server
   cp ws-server/.env.example ws-server/.env
   
   # Next.js application
   cp web/.env.local.example web/.env.local
   ```

2. **Generate secure secrets:**
   ```bash
   # Generate JWT_SECRET (use same value in both .env files)
   openssl rand -hex 32
   
   # Generate INTERNAL_API_SECRET (use same value in both .env files)
   openssl rand -hex 32
   ```

3. **Update environment files** with your actual values (see sections below)

## Environment Variables

### WebSocket Server (`ws-server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | JWT signing secret (must match Next.js) | Generated hex string |
| `REDIS_URL` | Redis TCP connection URL (from Upstash) | `redis://default:pass@host:6379` |
| `INTERNAL_API_SECRET` | Internal API secret (must match Next.js) | Generated hex string |
| `NEXT_API_URL` | Next.js API URL | `http://localhost:3000` |
| `LOG_LEVEL` | Logging verbosity | `debug` |

### Next.js Application (`web/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `ws://localhost:8080` |
| `NEXT_PUBLIC_USE_WEBSOCKET` | Enable WebSocket implementation | `true` |
| `JWT_SECRET` | JWT signing secret (must match WS server) | Generated hex string |
| `INTERNAL_API_SECRET` | Internal API secret (must match WS server) | Generated hex string |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL | `https://your-redis.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API token | Token from Upstash |
| `DATABASE_URL` | Prisma database connection | `postgresql://user:pass@host:5432/db` |
| `NEXT_PUBLIC_APP_URL` | Application base URL | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (legacy) | `https://project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (legacy) | Key from Supabase |

## Critical Configuration Notes

### Matching Secrets

The following secrets **MUST match** between both services:
- `JWT_SECRET` - Used for WebSocket authentication
- `INTERNAL_API_SECRET` - Used for internal API authentication

If these don't match, you'll see authentication errors.

### Redis Configuration

The WebSocket server and Next.js app use different Redis connection methods:
- **WebSocket Server**: Uses `REDIS_URL` (TCP connection from Upstash)
- **Next.js App**: Uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (REST API)

Both should point to the same Upstash Redis database.

### WebSocket URL Protocol

- **Local Development**: Use `ws://localhost:8080`
- **Production**: Use `wss://your-server.fly.dev` (secure WebSocket)

## Getting Credentials

### Upstash Redis

1. Go to https://console.upstash.com/
2. Create a new database (or use existing)
3. For **WebSocket server** (`REDIS_URL`):
   - Click "Redis" tab
   - Copy the connection string (format: `redis://default:password@host:port`)
4. For **Next.js app** (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`):
   - Click "REST API" tab
   - Copy the URL and Token

### Database

Configure your Prisma database connection string in `DATABASE_URL`:
- Format: `postgresql://user:password@host:port/database`
- For local PostgreSQL: `postgresql://postgres:password@localhost:5432/eclipse_support`

## Starting the Development Servers

### Terminal 1: WebSocket Server

```bash
cd ws-server
npm install
npm run dev
```

Expected output:
```
[INFO] Starting Eclipse WebSocket Server { port: 8080, nodeEnv: 'development' }
[INFO] Redis client initialized
[INFO] WebSocket server listening on port 8080
[INFO] Health check available at http://localhost:8080/health
```

### Terminal 2: Next.js Application

```bash
cd web
npm install
npm run dev
```

Expected output:
```
▲ Next.js 15.5.6
- Local:        http://localhost:3000
- Environments: .env.local
```

## Testing the Setup

1. **Test WebSocket server health:**
   ```bash
   curl http://localhost:8080/health
   ```
   Should return: `{"status":"healthy","uptime":...}`

2. **Test Next.js application:**
   - Open http://localhost:3000
   - Navigate to http://localhost:3000/test-embed
   - Try sending a message in the chat

3. **Check browser console:**
   - Should see WebSocket connection established
   - Messages should appear in real-time

## Troubleshooting

### "Missing required environment variable"

**Problem**: Server won't start due to missing env vars.

**Solution**:
1. Check that `.env` files exist in both `ws-server/` and `web/`
2. Verify all required variables are set (see `.env.example` files)
3. Restart the server after updating `.env` files

### "JWT_SECRET mismatch" or authentication errors

**Problem**: Secrets don't match between services.

**Solution**:
1. Ensure `JWT_SECRET` is identical in both:
   - `ws-server/.env`
   - `web/.env.local`
2. Ensure `INTERNAL_API_SECRET` is identical in both files
3. Restart both servers after updating

### "Failed to initialize Redis"

**Problem**: Redis connection fails.

**Solution**:
1. Verify `REDIS_URL` in `ws-server/.env` is correct
2. Check that the Redis URL format is: `redis://default:password@host:port`
3. Test Redis connection from Upstash dashboard
4. Ensure Redis database is active in Upstash

### "WebSocket connection refused"

**Problem**: Browser can't connect to WebSocket server.

**Solution**:
1. Verify WebSocket server is running (`npm run dev` in `ws-server/`)
2. Check `NEXT_PUBLIC_WS_URL` in `web/.env.local` is `ws://localhost:8080`
3. Check browser console for exact error message
4. Restart Next.js dev server after changing `.env.local`

### Port already in use

**Problem**: Port 8080 or 3000 is already in use.

**Solution**:
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

Or change the port in your `.env` files.

## Environment Validation

The application includes built-in environment validation that will:
- Check for missing required variables
- Validate URL formats
- Warn about placeholder values
- Provide helpful error messages

If you see validation errors, follow the suggestions in the error messages to fix your configuration.

## Production vs Development

### Local Development
- WebSocket: `ws://localhost:8080`
- Next.js API: `http://localhost:3000`
- Use `.env.local` for Next.js
- Use `.env` for WebSocket server

### Production
- WebSocket: `wss://your-server.fly.dev` (secure)
- Next.js API: `https://your-domain.vercel.app`
- Use production environment variables in your deployment platform
- See `PRODUCTION_DEPLOYMENT.md` for production setup

## Additional Resources

- `ws-server/LOCAL_DEV_CONFIG.md` - WebSocket server specific setup
- `ws-server/.env.example` - WebSocket server environment template
- `web/.env.local.example` - Next.js local environment template
- `web/.env.production.example` - Next.js production environment template

## Next Steps

Once your environment is set up:
1. Test the chat functionality
2. Test real-time message delivery
3. Test multi-user scenarios (open multiple browser tabs)
4. Review the codebase structure
5. Start developing new features!

