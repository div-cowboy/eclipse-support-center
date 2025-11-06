# 🚀 Production Deployment Guide

This guide explains how to deploy your Eclipse Support Center application to production, including the Next.js app (Vercel) and WebSocket server (Fly.io).

## 📋 Overview

Your application consists of two main components:

1. **Next.js Frontend/API** (deployed on Vercel)
   - Main application
   - API routes
   - Chat embed pages

2. **WebSocket Server** (deployed on Fly.io)
   - Real-time chat connections
   - Redis pub/sub for scaling

## 🔧 Environment Variables

### Vercel Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

```env
# WebSocket Server Configuration
NEXT_PUBLIC_USE_WEBSOCKET=true
NEXT_PUBLIC_WS_URL=wss://eclipse-ws-server.fly.dev

# Shared Secrets (must match ws-server)
JWT_SECRET=your-production-jwt-secret
INTERNAL_API_SECRET=your-production-internal-secret

# Redis (for API-side broadcasting)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# App URL (for email links, ticket URLs, etc.)
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app

# Database (if using Supabase)
# IMPORTANT: Use connection pooling URL (port 6543) for serverless/Vercel
# Format: postgresql://postgres:password@db.project.supabase.co:6543/postgres?pgbouncer=true
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:6543/postgres?pgbouncer=true
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**Important**: 
- Replace `wss://eclipse-ws-server.fly.dev` with your actual Fly.io WebSocket server URL
- Replace `https://your-vercel-domain.vercel.app` with your actual Vercel deployment URL
- Use the same `JWT_SECRET` and `INTERNAL_API_SECRET` in both Vercel and Fly.io

### Fly.io Secrets (WebSocket Server)

Deploy your WebSocket server to Fly.io:

```bash
cd ws-server
fly auth login
fly launch --no-deploy
```

Then set secrets:

```bash
# Server Configuration
fly secrets set PORT=8080
fly secrets set NODE_ENV=production
fly secrets set LOG_LEVEL=info

# JWT Configuration (must match Vercel)
fly secrets set JWT_SECRET=your-production-jwt-secret

# Redis Configuration
fly secrets set UPSTASH_REDIS_REST_URL=your-upstash-redis-url
fly secrets set UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# Next.js API Configuration (your Vercel URL)
fly secrets set NEXT_API_URL=https://your-vercel-domain.vercel.app
fly secrets set INTERNAL_API_SECRET=your-production-internal-secret
```

Then deploy:

```bash
fly deploy
```

After deployment, get your WebSocket URL:

```bash
fly status
# Look for the URL, it should be something like:
# https://eclipse-ws-server.fly.dev
# Use wss://eclipse-ws-server.fly.dev for WebSocket connections
```

## 🔍 Finding Your URLs

### Vercel URL

1. Go to your Vercel dashboard
2. Select your project
3. Go to the "Deployments" tab
4. Your production URL is shown at the top (e.g., `https://your-project.vercel.app`)
5. Or check your project settings → Domains

### Fly.io WebSocket URL

1. After deploying, run: `fly status`
2. Your app URL will be shown (e.g., `https://eclipse-ws-server.fly.dev`)
3. Use `wss://` instead of `https://` for WebSocket connections
4. Example: `wss://eclipse-ws-server.fly.dev`

## 🧪 Testing Production Deployment

### 1. Test WebSocket Server Health

```bash
curl https://eclipse-ws-server.fly.dev/health
```

Should return:
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "connections": {...}
}
```

### 2. Test Chat Embed

1. Open your Vercel URL: `https://your-vercel-domain.vercel.app/test-embed`
2. Open browser console (F12)
3. Look for WebSocket connection messages
4. Try sending a message
5. Check that messages appear in real-time

### 3. Test Widget

1. Create a test HTML page:
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://your-vercel-domain.vercel.app/eclipse-chat-widget.js"></script>
</head>
<body>
  <script>
    new EclipseChatWidget({
      chatbotId: 'your-chatbot-id',
      mode: 'icon',
      position: 'bottom-right'
    });
  </script>
</body>
</html>
```

2. Open the page and click the chat button
3. Verify the chat loads and connects to WebSocket

## 🐛 Troubleshooting

### "Connection blocked because it was initiated by a public page to connect to devices or servers on your private network"

**Problem**: Your production site is trying to connect to `localhost` or a private IP address.

**Solution**:
1. Check that `NEXT_PUBLIC_WS_URL` in Vercel is set to `wss://eclipse-ws-server.fly.dev` (not `ws://localhost:8080`)
2. Check that `NEXT_API_URL` in Fly.io is set to your Vercel URL (not `http://localhost:3000`)
3. Redeploy both services after changing environment variables

### WebSocket Connection Fails

1. **Check WebSocket URL**: Verify `NEXT_PUBLIC_WS_URL` is correct in Vercel
2. **Check JWT Secret**: Must match between Vercel and Fly.io
3. **Check Fly.io Status**: `fly status` and `fly logs`
4. **Check CORS**: WebSocket server should accept connections from your Vercel domain

### Messages Not Appearing

1. **Check Redis**: Verify Upstash Redis is configured correctly
2. **Check Internal API Secret**: Must match between services
3. **Check API URL**: Verify `NEXT_API_URL` in Fly.io points to correct Vercel URL
4. **Check Logs**: 
   - Vercel: Check function logs in dashboard
   - Fly.io: `fly logs`

### Database Connection Errors ("Can't reach database server")

**Problem**: Prisma can't connect to Supabase database from Vercel.

**Important**: pgBouncer is enabled on Supabase's side, not Vercel. Vercel just needs the correct connection string.

**Common Causes & Solutions**:

1. **IP Allowlisting (Most Common)**
   - Go to Supabase Dashboard → Settings → Database
   - Check "Connection Pooling" section
   - Ensure "Allow connections from anywhere" is enabled, OR
   - Add Vercel's IP ranges to allowed IPs
   - Vercel uses dynamic IPs, so allowlisting specific IPs won't work - use "Allow from anywhere" for connection pooling

2. **Connection String Format in Vercel**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Verify `DATABASE_URL` uses connection pooling URL:
     ```
     postgresql://postgres:password@db.project.supabase.co:6543/postgres?pgbouncer=true
     ```
   - Port `6543` with `pgbouncer=true` is required for serverless/Vercel
   - Port `5432` is for direct connections (migrations only, not for Vercel)
   - Ensure it's set for "Production" environment (not just Preview)
   - Check for extra spaces, quotes, or line breaks

3. **Supabase Project Status**
   - Check Supabase Dashboard → Project Settings
   - Ensure project is not paused
   - Free tier projects pause after 1 week of inactivity
   - Resume project if paused

4. **Connection String in Vercel**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Verify `DATABASE_URL` is set correctly
   - Check for extra spaces or quotes
   - Ensure it's set for "Production" environment (not just Preview)

5. **Test Connection**
   ```bash
   # Test from local machine (should work)
   psql "postgresql://postgres:password@db.project.supabase.co:6543/postgres?pgbouncer=true"
   
   # If local works but Vercel doesn't, it's likely IP allowlisting
   ```

**Quick Fix**:
1. Supabase Dashboard → Settings → Database
2. Connection Pooling → Ensure "Allow connections from anywhere" is enabled
3. Save and wait 1-2 minutes for changes to propagate
4. Redeploy on Vercel

## 🔄 Local Development

For local development, use these environment variables:

### `.env.local` (Next.js)

```env
NEXT_PUBLIC_USE_WEBSOCKET=true
NEXT_PUBLIC_WS_URL=ws://localhost:8080
JWT_SECRET=your-local-jwt-secret
INTERNAL_API_SECRET=your-local-internal-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `ws-server/.env` (WebSocket Server)

```env
PORT=8080
NODE_ENV=development
JWT_SECRET=your-local-jwt-secret
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
NEXT_API_URL=http://localhost:3000
INTERNAL_API_SECRET=your-local-internal-secret
LOG_LEVEL=debug
```

## 📝 Checklist

Before deploying to production:

- [ ] WebSocket server deployed to Fly.io
- [ ] Fly.io secrets configured (JWT_SECRET, NEXT_API_URL, etc.)
- [ ] Vercel environment variables configured
- [ ] `NEXT_PUBLIC_WS_URL` set to Fly.io WebSocket URL (wss://)
- [ ] `NEXT_API_URL` in Fly.io set to Vercel URL
- [ ] Same `JWT_SECRET` in both Vercel and Fly.io
- [ ] Same `INTERNAL_API_SECRET` in both Vercel and Fly.io
- [ ] Redis configured in both services
- [ ] Health check passes: `curl https://eclipse-ws-server.fly.dev/health`
- [ ] Test chat embed works in production
- [ ] Test widget works on external site

## 🎯 Quick Reference

### Production URLs Pattern

- **Vercel App**: `https://your-project.vercel.app`
- **WebSocket Server**: `wss://eclipse-ws-server.fly.dev`
- **Widget Script**: `https://your-project.vercel.app/eclipse-chat-widget.js`
- **Embed URL**: `https://your-project.vercel.app/embed/chat?chatbotId=xxx`

### Environment Variables Summary

| Variable | Vercel | Fly.io | Purpose |
|----------|--------|--------|---------|
| `NEXT_PUBLIC_WS_URL` | ✅ | ❌ | WebSocket server URL |
| `NEXT_API_URL` | ❌ | ✅ | Next.js API URL |
| `JWT_SECRET` | ✅ | ✅ | Must match! |
| `INTERNAL_API_SECRET` | ✅ | ✅ | Must match! |
| `UPSTASH_REDIS_REST_URL` | ✅ | ✅ | Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | ✅ | Redis token |
| `NEXT_PUBLIC_APP_URL` | ✅ | ❌ | App base URL |

## 🔐 Security Notes

1. **Never commit secrets**: All secrets should be in environment variables
2. **Use different secrets for dev/staging/prod**: Rotate secrets regularly
3. **HTTPS only**: Always use `https://` and `wss://` in production
4. **CORS**: Configure CORS properly on WebSocket server
5. **Rate limiting**: Consider adding rate limiting for production

## 📚 Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Fly.io Secrets](https://fly.io/docs/reference/secrets/)
- [WebSocket Server README](../ws-server/README.md)

