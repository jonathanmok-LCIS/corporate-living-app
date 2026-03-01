#!/bin/bash

# Check Environment Configuration Script
# This script verifies that your .env.local file is properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Environment Configuration Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ ERROR: .env.local file not found!${NC}"
    echo ""
    echo "You need to create a .env.local file with your Supabase credentials."
    echo ""
    echo -e "${YELLOW}Quick fix:${NC}"
    echo "  1. Copy the example file:"
    echo -e "     ${GREEN}cp .env.example .env.local${NC}"
    echo ""
    echo "  2. Edit .env.local and replace placeholder values with your actual credentials"
    echo ""
    echo "  3. OR run the interactive setup:"
    echo -e "     ${GREEN}./scripts/setup-env.sh${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} .env.local file exists"

# Source the .env.local file
source .env.local 2>/dev/null || true

# Check each required variable
has_errors=0

echo ""
echo "Checking environment variables..."
echo ""

# Check NEXT_PUBLIC_SUPABASE_URL
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL${NC} - Missing"
    has_errors=1
elif [[ "$NEXT_PUBLIC_SUPABASE_URL" == *"your-project-url"* ]]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_URL${NC} - Still has placeholder value"
    has_errors=1
else
    echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL - ${NEXT_PUBLIC_SUPABASE_URL}"
fi

# Check NEXT_PUBLIC_SUPABASE_ANON_KEY
if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY${NC} - Missing"
    has_errors=1
elif [[ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" == *"your-anon-key"* ]]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY${NC} - Still has placeholder value"
    has_errors=1
else
    echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY - ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
fi

# Check SUPABASE_SERVICE_ROLE_KEY
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY${NC} - Missing"
    has_errors=1
elif [[ "$SUPABASE_SERVICE_ROLE_KEY" == *"your-service-role-key"* ]]; then
    echo -e "${YELLOW}⚠️  SUPABASE_SERVICE_ROLE_KEY${NC} - Still has placeholder value"
    has_errors=1
else
    echo -e "${GREEN}✓${NC} SUPABASE_SERVICE_ROLE_KEY - ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
fi

echo ""

if [ $has_errors -eq 1 ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  Configuration Incomplete${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Please update your .env.local file with actual credentials."
    echo ""
    echo -e "${YELLOW}Where to find your credentials:${NC}"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Go to Settings → API"
    echo "  4. Copy the values to your .env.local file"
    echo ""
    echo -e "${YELLOW}Or run the interactive setup:${NC}"
    echo -e "  ${GREEN}./scripts/setup-env.sh${NC}"
    echo ""
    exit 1
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓ Configuration Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Your environment is properly configured."
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Make sure your database migrations are run (see SETUP.md)"
    echo "  2. Start the development server:"
    echo -e "     ${GREEN}npm run dev${NC}"
    echo ""
fi
