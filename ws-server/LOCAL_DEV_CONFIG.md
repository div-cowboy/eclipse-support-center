# 🚀 Local Development Configuration

## Generated Secrets (Use These!)

I've generated secure secrets for you:

### JWT_SECRET (for both apps)

```
6f52209920346cecd52e3c04a9bd89f61b36bfeca98c5e1ef39e1f72c655c847
```

### INTERNAL_API_SECRET (for both apps)

```
42aec25f537b789468b932f13f693f6ea28112add82df9ee31b9e86781dd4b3b
```

---

## Step 1: Configure WebSocket Server

Edit `ws-server/.env` and add:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# JWT Configuration
JWT_SECRET=6f52209920346cecd52e3c04a9bd89f61b36bfeca98c5e1ef39e1f72c655c847

# Upstash Redis Configuration
# 👉 YOU NEED TO ADD YOUR UPSTASH CREDENTIALS HERE:
UPSTASH_REDIS_REST_URL=https://your-redis-name.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here

# Next.js API Configuration
NEXT_API_URL=http://localhost:3000
INTERNAL_API_SECRET=42aec25f537b789468b932f13f693f6ea28112add82df9ee31b9e86781dd4b3b

# Logging
LOG_LEVEL=debug
```

### How to get Upstash credentials:

1. Go to https://console.upstash.com/
2. Log in (or create account - it's free!)
3. Click "Create Database"
4. Name it "eclipse-chat-dev"
5. Select your region
6. Click "REST API" tab
7. Copy the URL and Token to the .env file above

---

## Step 2: Configure Next.js App

Add these to your main `.env.local` file:

```env
# WebSocket Server Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Shared Secrets (must match ws-server/.env)
JWT_SECRET=6f52209920346cecd52e3c04a9bd89f61b36bfeca98c5e1ef39e1f72c655c847
INTERNAL_API_SECRET=42aec25f537b789468b932f13f693f6ea28112add82df9ee31b9e86781dd4b3b
```

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
