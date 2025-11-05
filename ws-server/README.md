# Eclipse WebSocket Server

Production-ready WebSocket server for Eclipse Support Center real-time chat.

## Features

- ✅ JWT-based authentication
- ✅ Redis pub/sub for horizontal scaling
- ✅ Automatic reconnection handling
- ✅ Connection heartbeat monitoring
- ✅ Graceful shutdown
- ✅ Health check endpoint
- ✅ Structured logging
- ✅ Docker containerized

## Architecture

```
Client (Browser) 
    ↓ WebSocket (wss://)
WebSocket Server (This service)
    ↓ Redis Pub/Sub
Upstash Redis
    ↓ HTTP API
Next.js API (Database writes)
```

## Local Development

### Prerequisites

- Node.js 20+
- Upstash Redis account
- JWT secret (shared with Next.js app)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure `.env`:
```env
PORT=8080
NODE_ENV=development
JWT_SECRET=your-jwt-secret
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
NEXT_API_URL=http://localhost:3000
INTERNAL_API_SECRET=your-internal-secret
LOG_LEVEL=debug
```

4. Start development server:
```bash
npm run dev
```

Server will be available at `ws://localhost:8080`

### Testing

Test the health endpoint:
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 123.456,
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

## Deployment to Fly.io

### Prerequisites

- Fly.io account
- Fly CLI installed (`curl -L https://fly.io/install.sh | sh`)

### Deploy

1. Login to Fly.io:
```bash
fly auth login
```

2. Create app (first time only):
```bash
fly launch --no-deploy
```

3. Set secrets:
```bash
fly secrets set JWT_SECRET=your-production-jwt-secret
fly secrets set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
fly secrets set UPSTASH_REDIS_REST_TOKEN=your-production-token
fly secrets set NEXT_API_URL=https://your-app.vercel.app
fly secrets set INTERNAL_API_SECRET=your-internal-secret
```

4. Deploy:
```bash
fly deploy
```

5. Check status:
```bash
fly status
fly logs
```

### Scaling

Scale to multiple instances:
```bash
fly scale count 2 --region iad
```

Scale memory:
```bash
fly scale memory 1024
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 8080) |
| `NODE_ENV` | No | Environment (development/production) |
| `JWT_SECRET` | **Yes** | JWT secret (must match Next.js app) |
| `UPSTASH_REDIS_REST_URL` | **Yes** | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | **Yes** | Upstash Redis REST token |
| `NEXT_API_URL` | **Yes** | Next.js API base URL |
| `INTERNAL_API_SECRET` | **Yes** | Secret for inter-service auth |
| `LOG_LEVEL` | No | Log level (debug/info/warn/error) |

## Message Types

### Client → Server

**Chat Message:**
```json
{
  "type": "message",
  "content": "Hello!",
  "role": "USER"
}
```

**Typing Indicator:**
```json
{
  "type": "typing",
  "isTyping": true
}
```

**Agent Joined:**
```json
{
  "type": "agent_joined",
  "agentId": "user_123",
  "agentName": "John Doe"
}
```

**Ping:**
```json
{
  "type": "ping"
}
```

### Server → Client

**Connected:**
```json
{
  "type": "connected",
  "chatId": "chat_123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Message:**
```json
{
  "type": "message",
  "data": {
    "id": "msg_123",
    "content": "Hello!",
    "role": "user",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "sender": {
      "id": "user_123",
      "name": "John Doe"
    }
  }
}
```

**Typing:**
```json
{
  "type": "typing",
  "data": {
    "userId": "user_123",
    "isTyping": true
  }
}
```

**Error:**
```json
{
  "type": "error",
  "error": "Error message"
}
```

## Monitoring

### Health Check

```bash
curl https://eclipse-ws-server.fly.dev/health
```

### Logs

```bash
fly logs
```

### Metrics

```bash
fly dashboard
```

## Troubleshooting

### Connection Refused

- Check if server is running: `fly status`
- Check logs: `fly logs`
- Verify environment variables: `fly secrets list`

### Authentication Failed

- Verify JWT_SECRET matches Next.js app
- Check token expiration (tokens expire after 1 hour)
- Ensure token is passed in query string: `?token=xxx`

### Messages Not Broadcasting

- Check Redis connection: Look for Redis errors in logs
- Verify UPSTASH_REDIS_REST_URL and TOKEN are correct
- Check if multiple clients are connected to the same chat

## Performance

- **Connections:** Up to 5,000 concurrent connections per instance
- **Latency:** <50ms for message delivery (same region)
- **Memory:** ~512MB per instance (can handle 5K connections)
- **CPU:** Shared CPU is sufficient for most workloads

## Security

- JWT tokens expire after 1 hour
- Internal API calls require INTERNAL_API_SECRET
- WebSocket connections are authenticated per-chat
- No user data is logged (only IDs)
- Redis channels are isolated per chat

## License

MIT

