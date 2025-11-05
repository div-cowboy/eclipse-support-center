# Quick Setup Guide

## Step 1: Configure Environment Variables

Edit `ws-server/.env` and update these values:

### 1. JWT_SECRET

**Must match your main Next.js app's JWT_SECRET!**

Find it in your main `.env.local` file:

```bash
# In eclipse-support-center-next/.env.local
JWT_SECRET=your-actual-secret
```

Copy this exact value to `ws-server/.env`

### 2. Upstash Redis Credentials

Get these from your Upstash dashboard (https://console.upstash.com/redis):

1. Go to your Redis database
2. Click "REST API" tab
3. Copy:
   - `UPSTASH_REDIS_REST_URL` (e.g., https://usw1-pro-abc-12345.upstash.io)
   - `UPSTASH_REDIS_REST_TOKEN` (the long token string)

### 3. INTERNAL_API_SECRET

Generate a random secret:

```bash
openssl rand -hex 32
```

**Important:** Add this same secret to your Next.js app's `.env.local`:

```
INTERNAL_API_SECRET=your-generated-secret
```

## Step 2: Start the Server

```bash
cd ws-server
npm run dev
```

You should see:

```
[INFO] Starting Eclipse WebSocket Server { port: 8080, nodeEnv: 'development' }
[INFO] Redis client initialized
[INFO] WebSocket server listening on port 8080
[INFO] Health check available at http://localhost:8080/health
[INFO] WebSocket endpoint: ws://localhost:8080
```

## Step 3: Test the Server

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "status": "healthy",
  "uptime": 5.123,
  "connections": {
    "total": 0,
    "byChat": []
  },
  "memory": {
    "used": 12345678,
    "total": 50000000,
    "percentage": 25
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Step 4: Update Next.js Environment

Add to your main `eclipse-support-center-next/.env.local`:

```env
# WebSocket Server (Local Development)
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Internal API Secret (for WS server to call Next.js API)
INTERNAL_API_SECRET=your-generated-secret

# JWT Secret (must match WS server)
JWT_SECRET=your-existing-jwt-secret
```

## Common Issues

### "Missing required environment variable"

- Check that all required env vars are set in `.env`
- Restart the server after changing `.env`

### "Failed to initialize Redis"

- Verify your Upstash credentials are correct
- Check that your Upstash Redis instance is active
- Test connection: `curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" $UPSTASH_REDIS_REST_URL/ping`

### "Address already in use" (Port 8080)

- Kill the process using port 8080: `lsof -ti:8080 | xargs kill -9`
- Or change PORT in `.env` to something else (e.g., 8081)

## Next Steps

Once the WS server is running locally:

1. Start your Next.js app: `npm run dev` (in main directory)
2. Open http://localhost:3000
3. The chat interface will now use your local WebSocket server
4. Watch the WS server logs to see connections and messages

## Production Deployment

When ready for production, see the main README.md for Fly.io deployment instructions.
