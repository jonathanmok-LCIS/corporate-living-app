#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║          🚨 BUILD ERROR? RUN THIS SCRIPT! 🚨              ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will fix your nested directory structure issue."
echo "Press ENTER to continue or CTRL+C to cancel..."
read

echo ""
echo "Step 1: Checking your directory structure..."
echo "---------------------------------------------------"
pwd
echo ""

# Check for nested directory
if [ -d "corporate-living-app" ]; then
    echo "⚠️  PROBLEM FOUND: You have a nested corporate-living-app/ directory"
    echo ""
    echo "Fixing this in 3 seconds..."
    sleep 3
    
    echo "Moving files from nested directory..."
    mv corporate-living-app/* . 2>/dev/null || true
    mv corporate-living-app/.[!.]* . 2>/dev/null || true
    
    echo "Removing empty nested directory..."
    rm -rf corporate-living-app
    
    echo "✅ Nested directory fixed!"
else
    echo "✅ No nested directory found"
fi

echo ""
echo "Step 2: Removing old problematic files..."
echo "---------------------------------------------------"
rm -rf app/auth && echo "  ✓ Removed app/auth" || echo "  ✓ app/auth didn't exist"
rm -rf app/dashboard && echo "  ✓ Removed app/dashboard" || echo "  ✓ app/dashboard didn't exist"
rm -rf components/layout && echo "  ✓ Removed components/layout" || echo "  ✓ components/layout didn't exist"
rm -rf utils/supabase && echo "  ✓ Removed utils/supabase" || echo "  ✓ utils/supabase didn't exist"

echo ""
echo "Step 3: Cleaning build artifacts..."
echo "---------------------------------------------------"
rm -rf .next node_modules
echo "✅ Cleaned .next and node_modules"

echo ""
echo "Step 4: Installing dependencies..."
echo "---------------------------------------------------"
npm install

echo ""
echo "Step 5: Building the project..."
echo "---------------------------------------------------"
npm run build

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║                     ✅ ALL DONE! ✅                        ║"
echo "║                                                            ║"
echo "║  If the build succeeded, you're ready to go!              ║"
echo "║  If it failed, try the fresh clone option:                ║"
echo "║                                                            ║"
echo "║  cd /Users/jwkmo                                           ║"
echo "║  mv corporate-living-app corporate-living-app.broken       ║"
echo "║  git clone https://github.com/jonathanmok-LCIS/...         ║"
echo "║  cd corporate-living-app                                   ║"
echo "║  git checkout copilot/add-move-out-intention-feature       ║"
echo "║  npm install && npm run build                              ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
