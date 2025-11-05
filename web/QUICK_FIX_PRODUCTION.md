# 🚨 Quick Fix: Production Deployment Issue

## The Problem

You're seeing this error:
> "The connection is blocked because it was initiated by a public page to connect to devices or servers on your private network."

This happens because your production site (on Vercel) is trying to connect to `localhost:3000` or `ws://localhost:8080`, which browsers block for security reasons.

## The Solution

You need to:
1. Deploy your WebSocket server to Fly.io (or another hosting service)
2. Update environment variables in Vercel to point to production URLs

## Step 1: Deploy WebSocket Server to Fly.io

If you haven't already:

```bash
cd ws-server
fly auth login
fly launch --no-deploy
```

Then set your production secrets:

```bash
# Replace with your actual Vercel URL
fly secrets set NEXT_API_URL=https://eclipse-support-center-git-main-wmg.vercel.app

# Set other required secrets (use same values as in Vercel)
fly secrets set JWT_SECRET=your-jwt-secret
fly secrets set INTERNAL_API_SECRET=your-internal-secret
fly secrets set UPSTASH_REDIS_REST_URL=your-redis-url
fly secrets set UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Deploy
fly deploy
```

After deployment, get your WebSocket URL:

```bash
fly status
# Look for the URL, e.g., https://eclipse-ws-server.fly.dev
# Use wss://eclipse-ws-server.fly.dev for WebSocket
```

## Step 2: Update Vercel Environment Variables

Go to your Vercel project → Settings → Environment Variables and update:

1. **`NEXT_PUBLIC_WS_URL`**: Change from `ws://localhost:8080` to `wss://eclipse-ws-server.fly.dev` (or your actual Fly.io URL)

2. **`NEXT_PUBLIC_APP_URL`**: Set to your Vercel URL, e.g., `https://eclipse-support-center-git-main-wmg.vercel.app`

3. Make sure these match between Vercel and Fly.io:
   - `JWT_SECRET` (must be the same)
   - `INTERNAL_API_SECRET` (must be the same)

## Step 3: Redeploy

After updating environment variables:

1. **Redeploy Vercel**: Go to Deployments → Redeploy latest deployment
2. **Test**: Open your Vercel URL and test the chat

## Quick Test

1. Open: `https://your-vercel-domain.vercel.app/test-embed`
2. Open browser console (F12)
3. Look for: `[useWebSocketChat] Connecting to wss://...` (should NOT say localhost)
4. Try sending a message
5. Check that it works!

## If It Still Doesn't Work

1. **Check WebSocket URL**: Verify `NEXT_PUBLIC_WS_URL` in Vercel is correct
2. **Check Fly.io Status**: `fly status` and `fly logs`
3. **Check Health**: `curl https://eclipse-ws-server.fly.dev/health`
4. **Check Secrets**: Make sure JWT_SECRET matches in both places

## Local Development Still Works

Your local development setup is unchanged:
- Local dev: `NEXT_PUBLIC_WS_URL=ws://localhost:8080`
- Production: `NEXT_PUBLIC_WS_URL=wss://eclipse-ws-server.fly.dev`

The widget automatically detects the correct URL based on where it's running!

