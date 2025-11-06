# Eclipse Support Center

A Next.js application for customer support with real-time chat functionality.

## Quick Start

### 1. Set Up Environment

Run the automated setup script:

```bash
./scripts/setup-dev-env.sh
```

Or manually copy the example files:

```bash
cp .env.local.example .env.local
cp ../ws-server/.env.example ../ws-server/.env
```

### 2. Configure Environment Variables

Edit `.env.local` and fill in your values. See `.env.local.example` for reference.

**Important**: Make sure these values match between `web/.env.local` and `ws-server/.env`:
- `JWT_SECRET`
- `INTERNAL_API_SECRET`

### 3. Start Development Servers

**Terminal 1 - WebSocket Server:**
```bash
cd ../ws-server
npm install
npm run dev
```

**Terminal 2 - Next.js App:**
```bash
npm install
npm run dev
```

### 4. Open the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

Test the chat functionality at [http://localhost:3000/test-embed](http://localhost:3000/test-embed).

## Documentation

- **[DEVELOPMENT_SETUP.md](../DEVELOPMENT_SETUP.md)** - Comprehensive development environment setup guide
- **[ws-server/LOCAL_DEV_CONFIG.md](../ws-server/LOCAL_DEV_CONFIG.md)** - WebSocket server configuration
- **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** - Production deployment guide

## Environment Variables

See `.env.local.example` for all available environment variables and their descriptions.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
