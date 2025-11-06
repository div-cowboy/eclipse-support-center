# 🚀 Fly.io Deployment Plan for WebSocket Server

This document outlines a phased approach to deploying the Eclipse WebSocket server to Fly.io.

## 📋 Overview

The WebSocket server is a critical component that handles real-time chat connections. It uses:
- **WebSocket** for client connections
- **Redis** (via Upstash) for pub/sub messaging across instances
- **JWT** for authentication
- **HTTP API** calls to the Next.js backend

## 🎯 Pre-Deployment Checklist

Before starting deployment, ensure you have:

- [ ] Fly.io account created
- [ ] Fly CLI installed (`curl -L https://fly.io/install.sh | sh`)
- [ ] Production Redis instance (Upstash) ready
- [ ] Production JWT secret generated
- [ ] Production INTERNAL_API_SECRET generated
- [ ] Production Next.js app URL (Vercel deployment URL)

---

## 🔍 Phase 0: Pre-Deployment Verification

### Purpose
Verify configuration, identify issues, and prepare for deployment.

### Tasks

1. **Verify Redis Configuration**
   - ✅ Current code uses `REDIS_URL` (expects Redis connection string)
   - ⚠️ Documentation mentions `UPSTASH_REDIS_REST_URL` (REST API)
   - **Action Required**: Ensure Upstash Redis provides a Redis connection URL (not REST API)
   - Upstash typically provides: `redis://default:password@host:port`

2. **Review Environment Variables**
   - Current required vars in `server.ts`:
     - `JWT_SECRET` ✅
     - `REDIS_URL` ✅
     - `INTERNAL_API_SECRET` ✅
   - Additional vars used:
     - `PORT` (default: 8080)
     - `NODE_ENV` (default: development)
     - `LOG_LEVEL` (default: info)
     - `NEXT_API_URL` (default: http://localhost:3000)

3. **Verify Dockerfile**
   - ✅ Multi-stage build (good for production)
   - ✅ Non-root user (security best practice)
   - ✅ Health check configured
   - ✅ Uses Node 20 (matches package.json)

4. **Verify fly.toml**
   - ✅ App name: `eclipse-ws-server`
   - ✅ Primary region: `iad`
   - ✅ HTTP service configured
   - ✅ Health check endpoint: `/health`
   - ✅ Auto-scaling configured (min_machines_running: 1)
   - ✅ Connection limits: 5000 hard, 4000 soft

5. **Test Local Build**
   ```bash
   cd ws-server
   npm run build
   # Verify dist/ folder exists with compiled files
   ```

---

## 📦 Phase 1: Initial Fly.io Setup

### Purpose
Create Fly.io app, configure basic settings, and set up secrets.

### Tasks

1. **Install Fly CLI** (if not already installed)
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly.io**
   ```bash
   fly auth login
   ```

3. **Create Fly.io App** (if not already created)
   ```bash
   cd ws-server
   fly launch --no-deploy
   ```
   - This will create `fly.toml` (already exists, may ask to update)
   - Choose region: `iad` (or your preferred region)
   - Do NOT deploy yet

4. **Verify fly.toml Configuration**
   - Review `fly.toml` matches current setup
   - Ensure app name is correct
   - Verify region is appropriate

5. **Set Required Secrets**

   **Critical**: These secrets must match your production Next.js app:
   
   ```bash
   # JWT Secret (MUST match Vercel/NEXT_PUBLIC JWT_SECRET)
   fly secrets set JWT_SECRET=your-production-jwt-secret
   
   # Redis Connection URL (Upstash Redis connection string)
   # Format: redis://default:password@host:port
   fly secrets set REDIS_URL=redis://default:your-password@your-redis-host:6379
   
   # Internal API Secret (MUST match Vercel INTERNAL_API_SECRET)
   fly secrets set INTERNAL_API_SECRET=your-production-internal-secret
   
   # Next.js API URL (your Vercel deployment URL)
   fly secrets set NEXT_API_URL=https://your-app.vercel.app
   ```

   **Optional but recommended**:
   ```bash
   # Server Configuration
   fly secrets set PORT=8080
   fly secrets set NODE_ENV=production
   fly secrets set LOG_LEVEL=info
   ```

6. **Verify Secrets**
   ```bash
   fly secrets list
   ```
   - Verify all required secrets are set
   - **DO NOT** display secret values (they're masked)

---

## 🧪 Phase 2: Test Deployment

### Purpose
Deploy to Fly.io, verify it works, and test connectivity.

### Tasks

1. **Deploy to Fly.io**
   ```bash
   cd ws-server
   fly deploy
   ```
   - Watch for build errors
   - Note the deployment URL (e.g., `https://eclipse-ws-server.fly.dev`)

2. **Check Deployment Status**
   ```bash
   fly status
   ```
   - Verify machine is running
   - Check region and size

3. **Test Health Endpoint**
   ```bash
   curl https://eclipse-ws-server.fly.dev/health
   ```
   - Expected: JSON response with status, uptime, connections
   - Status should be "healthy" or "degraded" (if Redis check fails)

4. **Check Logs**
   ```bash
   fly logs
   ```
   - Look for startup messages
   - Verify Redis connection successful
   - Check for any errors

5. **Test WebSocket Connection** (from browser console)
   ```javascript
   // First, get a token from your Next.js API
   // Then test WebSocket connection:
   const ws = new WebSocket('wss://eclipse-ws-server.fly.dev?token=YOUR_TOKEN');
   ws.onopen = () => console.log('Connected!');
   ws.onmessage = (msg) => console.log('Message:', msg.data);
   ws.onerror = (err) => console.error('Error:', err);
   ```

6. **Verify Redis Connection**
   - Check logs for "Redis client connected"
   - Health endpoint should show Redis status

---

## 🔧 Phase 3: Production Configuration

### Purpose
Optimize for production, configure scaling, and set up monitoring.

### Tasks

1. **Update fly.toml for Production** (if needed)
   - Review memory allocation (currently 512mb)
   - Review CPU allocation (currently shared, 1 CPU)
   - Consider scaling if needed:
     ```bash
     fly scale memory 1024  # Increase if needed
     fly scale count 2      # Add more instances for HA
     ```

2. **Configure Auto-scaling** (if needed)
   - Current: `min_machines_running: 1`
   - For high availability, consider:
     ```toml
     min_machines_running = 2
     ```

3. **Set Up Monitoring** (optional but recommended)
   ```bash
   # Enable metrics
   fly dashboard
   ```
   - Monitor connection count
   - Monitor memory usage
   - Monitor error rates

4. **Configure Custom Domain** (optional)
   ```bash
   fly certs add your-domain.com
   ```
   - Update WebSocket URL in Next.js app accordingly

---

## 🔗 Phase 4: Integration with Next.js App

### Purpose
Update Next.js app to use production WebSocket server.

### Tasks

1. **Update Vercel Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update/Add:
     ```env
     NEXT_PUBLIC_USE_WEBSOCKET=true
     NEXT_PUBLIC_WS_URL=wss://eclipse-ws-server.fly.dev
     ```
   - **Important**: Use `wss://` (secure WebSocket) not `ws://`

2. **Verify Shared Secrets Match**
   - `JWT_SECRET` in Vercel = `JWT_SECRET` in Fly.io
   - `INTERNAL_API_SECRET` in Vercel = `INTERNAL_API_SECRET` in Fly.io

3. **Redeploy Next.js App**
   - Trigger new deployment in Vercel
   - Wait for deployment to complete

4. **Test End-to-End**
   - Open production Next.js app
   - Open chat widget
   - Verify WebSocket connection works
   - Send test message
   - Verify message appears in real-time

---

## 🐛 Phase 5: Troubleshooting & Validation

### Purpose
Verify everything works, identify and fix issues.

### Tasks

1. **Test WebSocket Connection from Production**
   - Open browser console on production site
   - Check for WebSocket connection logs
   - Verify connection is to `wss://eclipse-ws-server.fly.dev`

2. **Test Multi-User Scenario**
   - Open chat in multiple browser tabs
   - Send message from one tab
   - Verify message appears in other tabs
   - Verify typing indicators work

3. **Test Reconnection**
   - Connect to WebSocket
   - Temporarily stop Fly.io machine
   - Verify client reconnects when machine restarts

4. **Monitor Logs**
   ```bash
   fly logs
   ```
   - Watch for errors
   - Verify message handling
   - Check Redis pub/sub activity

5. **Check Health Endpoint Regularly**
   ```bash
   curl https://eclipse-ws-server.fly.dev/health
   ```
   - Monitor connection counts
   - Monitor memory usage
   - Verify Redis health

---

## ⚠️ Known Issues & Considerations

### 1. Redis URL Configuration
- **Issue**: Code uses `REDIS_URL` but docs mention Upstash REST API
- **Solution**: Use Upstash Redis connection URL (not REST API)
- **Format**: `redis://default:password@host:port`
- **Action**: Verify Upstash provides Redis connection URL, not REST API URL

### 2. Environment Variable Mismatch
- **Issue**: Documentation shows `UPSTASH_REDIS_REST_URL` but code uses `REDIS_URL`
- **Solution**: Update documentation OR update code to match
- **Action**: Use `REDIS_URL` with Redis connection string format

### 3. WebSocket URL in Production
- **Issue**: Must use `wss://` (secure) not `ws://` (insecure)
- **Solution**: Always use `wss://` in production
- **Action**: Update `NEXT_PUBLIC_WS_URL` to use `wss://`

### 4. Shared Secrets
- **Issue**: Secrets must match between Fly.io and Vercel
- **Solution**: Use same `JWT_SECRET` and `INTERNAL_API_SECRET` in both
- **Action**: Document where production secrets are stored

---

## 📝 Post-Deployment Checklist

- [ ] WebSocket server deployed to Fly.io
- [ ] Health endpoint returns 200 OK
- [ ] Redis connection successful (check logs)
- [ ] WebSocket connects successfully (test from browser)
- [ ] Next.js app updated with production WebSocket URL
- [ ] Shared secrets match between Fly.io and Vercel
- [ ] End-to-end chat flow works in production
- [ ] Multi-user messaging works
- [ ] Logs show no critical errors
- [ ] Monitoring set up (if applicable)

---

## 🔄 Rollback Plan

If deployment fails:

1. **Check Logs**
   ```bash
   fly logs
   ```

2. **Verify Secrets**
   ```bash
   fly secrets list
   ```

3. **Redeploy Previous Version**
   ```bash
   fly releases  # List releases
   fly releases rollback <release-id>
   ```

4. **Or Destroy and Recreate**
   ```bash
   fly apps destroy eclipse-ws-server
   # Then restart from Phase 1
   ```

---

## 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io WebSocket Support](https://fly.io/docs/reference/private-networking/)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [WebSocket Server README](./README.md)
- [Local Development Guide](./LOCAL_DEV_CONFIG.md)

---

## 🎯 Summary

This deployment plan is divided into 5 phases:

1. **Phase 0**: Pre-deployment verification (review config, identify issues)
2. **Phase 1**: Initial Fly.io setup (create app, set secrets)
3. **Phase 2**: Test deployment (deploy, verify health, test WebSocket)
4. **Phase 3**: Production configuration (optimize, scale, monitor)
5. **Phase 4**: Integration (update Next.js app, test end-to-end)
6. **Phase 5**: Troubleshooting (validate, fix issues)

**Estimated Time**: 1-2 hours for complete deployment (depending on issues encountered)

**Next Steps**: Review this plan, then proceed with Phase 0 (verification).

