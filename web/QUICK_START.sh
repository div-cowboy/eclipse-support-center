#!/bin/bash

# Quick Start Guide for WebSocket Testing

echo "🚀 Eclipse WebSocket Chat - Quick Start"
echo "========================================"
echo ""

# Check if WebSocket server is running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ WebSocket server is running on port 8080"
else
    echo "❌ WebSocket server is NOT running"
    echo "   Start it with: cd ws-server && pnpm dev"
    exit 1
fi

# Check if Next.js is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Next.js is running on port 3000"
else
    echo "❌ Next.js is NOT running"
    echo "   Start it with: npm run dev"
    exit 1
fi

# Test WebSocket health
echo ""
echo "Testing WebSocket server health..."
HEALTH=$(curl -s http://localhost:8080/health)

if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ WebSocket server is healthy!"
    echo "$HEALTH" | jq '.'
else
    echo "❌ WebSocket server health check failed"
    exit 1
fi

echo ""
echo "🎉 Everything is running!"
echo ""
echo "Next steps:"
echo "1. Add to .env.local:"
echo "   NEXT_PUBLIC_USE_WEBSOCKET=true"
echo "   NEXT_PUBLIC_WS_URL=ws://localhost:8080"
echo ""
echo "2. Restart Next.js: npm run dev"
echo ""
echo "3. Open test page: http://localhost:3000/test-embed"
echo ""
echo "4. Watch logs in both terminals!"

