#!/bin/bash

# 🚀 FHE Poker - Deploy to Vercel
# Based on Vercel monorepo best practices

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 FHE Poker - Vercel Deployment${NC}"
echo ""

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Test build locally
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install

echo -e "${BLUE}🏗️  Testing local build...${NC}"
cd packages/nextjs
pnpm build

echo ""
echo -e "${GREEN}✅ Local build successful!${NC}"
echo ""

# Clean up build artifacts
rm -rf .next

# Go back to root and deploy
cd ../..
echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
vercel deploy --prod

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"

