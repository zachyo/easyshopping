#!/bin/bash

# Easy Shopping Backend Setup Script
# This script helps you set up the backend infrastructure

set -e

echo "🚀 Easy Shopping Backend Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL first:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql"
    echo "  macOS: brew install postgresql"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL found${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ first"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the backend directory${NC}"
    exit 1
fi

echo ""
echo "📦 Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencies already installed${NC}"
fi

echo ""
echo "🔧 Step 2: Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and add your credentials:${NC}"
    echo "   - ONEPIPE_API_KEY"
    echo "   - ONEPIPE_CLIENT_SECRET"
    echo "   - ONEPIPE_WEBHOOK_SECRET"
    echo "   - DB_PASSWORD"
    echo ""
    read -p "Press Enter to continue after editing .env..."
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
fi

echo ""
echo "🗄️  Step 3: Setting up database..."
read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter database name (default: easy_shopping): " DB_NAME
DB_NAME=${DB_NAME:-easy_shopping}

echo "Creating database..."
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    read -p "Drop and recreate? (y/N): " RECREATE
    if [ "$RECREATE" = "y" ] || [ "$RECREATE" = "Y" ]; then
        dropdb -U "$DB_USER" "$DB_NAME"
        createdb -U "$DB_USER" "$DB_NAME"
        echo -e "${GREEN}✅ Database recreated${NC}"
    fi
else
    createdb -U "$DB_USER" "$DB_NAME"
    echo -e "${GREEN}✅ Database created${NC}"
fi

echo "Running migrations..."
psql -U "$DB_USER" -d "$DB_NAME" -f database/schema.sql > /dev/null
echo -e "${GREEN}✅ Database schema created${NC}"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. Test the health endpoint:"
echo "   ${GREEN}curl http://localhost:3000/health${NC}"
echo ""
echo "3. Test the webhook:"
echo "   ${GREEN}node test-webhook.js${NC}"
echo ""
echo "4. Deploy to Railway:"
echo "   ${GREEN}railway init && railway up${NC}"
echo ""
echo "📚 See README.md for more information"
