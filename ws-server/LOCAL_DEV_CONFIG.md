# 🚀 Local Development Configuration

## Quick Start

The easiest way to set up your development environment is to use the setup script:

```bash
./scripts/setup-dev-env.sh
```

This script will:
- Copy `.env.example` files if `.env` doesn't exist
- Generate secure secrets if needed
- Validate your environment setup

---

## Manual Setup

### Step 1: Configure WebSocket Server

1. Copy the example file:
   ```bash
   cp ws-server/.env.example ws-server/.env
   ```

2. Edit `ws-server/.env` and fill in your values:
   - **JWT_SECRET**: Generate with `openssl rand -hex 32`
   - **INTERNAL_API_SECRET**: Generate with `openssl rand -hex 32`
   - **REDIS_URL**: Get from Upstash dashboard (Redis tab)
   - **NEXT_API_URL**: `http://localhost:3000` for local development

### Step 2: Configure Next.js App

1. Copy the example file:
   ```bash
   cp web/.env.local.example web/.env.local
   ```

2. Edit `web/.env.local` and fill in your values:
   - **JWT_SECRET**: Must match the value in `ws-server/.env`
   - **INTERNAL_API_SECRET**: Must match the value in `ws-server/.env`
   - **NEXT_PUBLIC_WS_URL**: `ws://localhost:8080` for local development
   - **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**: Get from Upstash dashboard (REST API tab)
   - **DATABASE_URL**: Your Prisma database connection string

### How to get Upstash credentials:

1. Go to https://console.upstash.com/
2. Log in (or create account - it's free!)
3. Click "Create Database"
4. Name it "eclipse-chat-dev"
5. Select your region
6. For **REDIS_URL** (WebSocket server): Click "Redis" tab, copy the connection string
7. For **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** (Next.js app): Click "REST API" tab, copy the URL and Token

---

## Step 3: Start Everything

### Terminal 1: Start WebSocket Server

```bash
cd ws-server
npm run dev
```

Expected output:

```
[INFO] Starting Eclipse WebSocket Server { port: 8080, nodeEnv: 'development' }
[INFO] Redis client initialized
[INFO] WebSocket server listening on port 8080
[INFO] Health check available at http://localhost:8080/health
```

### Terminal 2: Start Next.js App

```bash
cd ..  # (or open new terminal in main directory)
npm run dev
```

Expected output:

```
  ▲ Next.js 15.5.6
  - Local:        http://localhost:3000
  - Environments: .env.local
```

---

## Step 4: Test the Connection

Open a third terminal and test:

```bash
# Test WebSocket server health
curl http://localhost:8080/health

# You should see:
# {"status":"healthy","uptime":...}
```

Open your browser:

```
http://localhost:3000/test-embed
```

The chat should now connect to your local WebSocket server!

---

## 🎯 Quick Checklist

- [ ] Upstash Redis database created
- [ ] `ws-server/.env` configured with Upstash credentials
- [ ] `.env.local` in main directory has NEXT_PUBLIC_WS_URL and secrets
- [ ] WebSocket server running on http://localhost:8080
- [ ] Next.js app running on http://localhost:3000
- [ ] Health check works: `curl http://localhost:8080/health`

---

## 🐛 Troubleshooting

### "Missing required environment variable"

```bash
# Check your ws-server/.env file has all values
cat ws-server/.env | grep -v "^#"
```

### "Failed to initialize Redis"

```bash
# Test Redis connection directly
curl -H "Authorization: Bearer YOUR_TOKEN" YOUR_URL/ping
```

### Port 8080 already in use

```bash
# Kill whatever is using port 8080
lsof -ti:8080 | xargs kill -9
```

### WebSocket connection refused in browser

- Make sure WS server is running (`npm run dev` in ws-server/)
- Check browser console for exact error
- Verify NEXT_PUBLIC_WS_URL=ws://localhost:8080 in .env.local
- Restart Next.js dev server after changing .env.local

---

## 📋 What's Next?

Once everything is running locally:

1. **Test Chat Flow**: Open test embed page, send messages
2. **Watch Logs**: See real-time WebSocket activity in Terminal 1
3. **Test Reconnection**: Stop/start WS server, see browser reconnect
4. **Test Multi-User**: Open multiple browser tabs, see messages broadcast

When ready for production deployment, see `README.md` for Fly.io instructions.
