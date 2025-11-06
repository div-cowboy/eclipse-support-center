#!/bin/bash

# Development Environment Setup Script
# This script helps initialize the development environment by:
# - Copying .env.example files if .env doesn't exist
# - Generating secure secrets if not provided
# - Validating environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WS_SERVER_DIR="$PROJECT_ROOT/ws-server"
WEB_DIR="$PROJECT_ROOT/web"

echo -e "${BLUE}🚀 Eclipse Support Center - Development Environment Setup${NC}\n"

# Function to generate a secure random hex string
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    else
        # Fallback if openssl is not available
        cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -n 1
    fi
}

# Function to check if a file exists
file_exists() {
    [ -f "$1" ]
}

# Function to copy example file if target doesn't exist
setup_env_file() {
    local example_file=$1
    local target_file=$2
    local description=$3

    if file_exists "$target_file"; then
        echo -e "${GREEN}✓${NC} $description already exists: $target_file"
    else
        if file_exists "$example_file"; then
            cp "$example_file" "$target_file"
            echo -e "${GREEN}✓${NC} Created $description: $target_file"
            echo -e "  ${YELLOW}⚠${NC}  Please update $target_file with your actual values"
            return 0
        else
            echo -e "${RED}✗${NC} Example file not found: $example_file"
            return 1
        fi
    fi
}

# Setup WebSocket server .env
echo -e "${BLUE}📦 Setting up WebSocket server environment...${NC}"
setup_env_file \
    "$WS_SERVER_DIR/.env.example" \
    "$WS_SERVER_DIR/.env" \
    "WebSocket server .env file"

# Setup Next.js .env.local
echo -e "\n${BLUE}📦 Setting up Next.js application environment...${NC}"
setup_env_file \
    "$WEB_DIR/.env.local.example" \
    "$WEB_DIR/.env.local" \
    "Next.js .env.local file"

# Generate secrets if needed
echo -e "\n${BLUE}🔐 Generating secure secrets...${NC}"

# Check if JWT_SECRET needs to be generated
if [ -f "$WS_SERVER_DIR/.env" ]; then
    if grep -q "your-jwt-secret-here" "$WS_SERVER_DIR/.env" 2>/dev/null; then
        JWT_SECRET=$(generate_secret)
        echo -e "${GREEN}✓${NC} Generated JWT_SECRET"
        echo -e "  ${YELLOW}⚠${NC}  Update JWT_SECRET in both:"
        echo -e "     - $WS_SERVER_DIR/.env"
        echo -e "     - $WEB_DIR/.env.local"
        echo -e "  ${BLUE}Generated value:${NC} $JWT_SECRET"
    fi
fi

if [ -f "$WEB_DIR/.env.local" ]; then
    if grep -q "your-jwt-secret-here" "$WEB_DIR/.env.local" 2>/dev/null; then
        if [ -z "$JWT_SECRET" ]; then
            JWT_SECRET=$(generate_secret)
        fi
        echo -e "${GREEN}✓${NC} JWT_SECRET needs to be set in .env.local"
    fi
fi

# Check if INTERNAL_API_SECRET needs to be generated
if [ -f "$WS_SERVER_DIR/.env" ]; then
    if grep -q "your-internal-api-secret-here" "$WS_SERVER_DIR/.env" 2>/dev/null; then
        INTERNAL_SECRET=$(generate_secret)
        echo -e "${GREEN}✓${NC} Generated INTERNAL_API_SECRET"
        echo -e "  ${YELLOW}⚠${NC}  Update INTERNAL_API_SECRET in both:"
        echo -e "     - $WS_SERVER_DIR/.env"
        echo -e "     - $WEB_DIR/.env.local"
        echo -e "  ${BLUE}Generated value:${NC} $INTERNAL_SECRET"
    fi
fi

if [ -f "$WEB_DIR/.env.local" ]; then
    if grep -q "your-internal-api-secret-here" "$WEB_DIR/.env.local" 2>/dev/null; then
        if [ -z "$INTERNAL_SECRET" ]; then
            INTERNAL_SECRET=$(generate_secret)
        fi
        echo -e "${GREEN}✓${NC} INTERNAL_API_SECRET needs to be set in .env.local"
    fi
fi

# Validation summary
echo -e "\n${BLUE}📋 Validation Summary${NC}\n"

# Check for required files
echo -e "${BLUE}Checking required files...${NC}"
REQUIRED_FILES=(
    "$WS_SERVER_DIR/.env:WebSocket server .env"
    "$WEB_DIR/.env.local:Next.js .env.local"
)

ALL_GOOD=true
for file_info in "${REQUIRED_FILES[@]}"; do
    IFS=':' read -r file_path description <<< "$file_info"
    if file_exists "$file_path"; then
        echo -e "  ${GREEN}✓${NC} $description exists"
    else
        echo -e "  ${RED}✗${NC} $description missing: $file_path"
        ALL_GOOD=false
    fi
done

# Check for placeholder values
echo -e "\n${BLUE}Checking for placeholder values...${NC}"
if [ -f "$WS_SERVER_DIR/.env" ]; then
    if grep -qE "(your-|placeholder)" "$WS_SERVER_DIR/.env" 2>/dev/null; then
        echo -e "  ${YELLOW}⚠${NC}  ws-server/.env contains placeholder values"
        echo -e "     Please update with your actual configuration"
        ALL_GOOD=false
    else
        echo -e "  ${GREEN}✓${NC} ws-server/.env looks configured"
    fi
fi

if [ -f "$WEB_DIR/.env.local" ]; then
    if grep -qE "(your-|placeholder)" "$WEB_DIR/.env.local" 2>/dev/null; then
        echo -e "  ${YELLOW}⚠${NC}  web/.env.local contains placeholder values"
        echo -e "     Please update with your actual configuration"
        ALL_GOOD=false
    else
        echo -e "  ${GREEN}✓${NC} web/.env.local looks configured"
    fi
fi

# Final instructions
echo -e "\n${BLUE}📚 Next Steps${NC}\n"

if [ "$ALL_GOOD" = false ]; then
    echo -e "1. ${YELLOW}Update environment files${NC} with your actual values:"
    echo -e "   - Edit $WS_SERVER_DIR/.env"
    echo -e "   - Edit $WEB_DIR/.env.local"
    echo -e ""
    echo -e "2. ${YELLOW}Important:${NC} Make sure these values match between services:"
    echo -e "   - JWT_SECRET (must match in both .env files)"
    echo -e "   - INTERNAL_API_SECRET (must match in both .env files)"
    echo -e ""
    echo -e "3. ${YELLOW}Get your credentials:${NC}"
    echo -e "   - Redis: Get REDIS_URL from Upstash dashboard (Redis tab)"
    echo -e "   - Redis REST: Get UPSTASH_REDIS_REST_URL and token (REST API tab)"
    echo -e "   - Database: Configure DATABASE_URL for Prisma"
    echo -e ""
    echo -e "4. See documentation for more details:"
    echo -e "   - ws-server/LOCAL_DEV_CONFIG.md"
    echo -e "   - DEVELOPMENT_SETUP.md"
else
    echo -e "${GREEN}✓${NC} Environment files are configured!"
    echo -e ""
    echo -e "You can now start the development servers:"
    echo -e ""
    echo -e "  ${BLUE}Terminal 1 - WebSocket Server:${NC}"
    echo -e "    cd ws-server && npm run dev"
    echo -e ""
    echo -e "  ${BLUE}Terminal 2 - Next.js App:${NC}"
    echo -e "    cd web && npm run dev"
    echo -e ""
    echo -e "  ${BLUE}Test the setup:${NC}"
    echo -e "    Open http://localhost:3000/test-embed"
fi

echo -e "\n${GREEN}✨ Setup complete!${NC}\n"

