#!/bin/bash
# Quick Fix Script for Build Errors
# Run this to fix the build error from missing components

echo "======================================"
echo "Quick Fix for Build Error"
echo "======================================"
echo ""

# Navigate to project directory
cd /Users/jwkmo/corporate-living-app || exit 1

echo "Step 1: Stashing local changes (if any)..."
git stash

echo ""
echo "Step 2: Fetching latest from remote..."
git fetch origin

echo ""
echo "Step 3: Hard reset to match remote branch..."
git reset --hard origin/copilot/add-move-out-intention-feature

echo ""
echo "Step 4: Removing old component files..."
rm -rf components/layout
rm -rf app/dashboard
rm -rf app/auth

echo ""
echo "Step 5: Cleaning build artifacts..."
rm -rf .next
rm -rf node_modules

echo ""
echo "Step 6: Installing dependencies..."
npm install

echo ""
echo "Step 7: Building project..."
npm run build

echo ""
echo "======================================"
echo "Fix Complete!"
echo "======================================"
echo ""
echo "If build succeeded, you're ready to go!"
echo "If build failed, see BUILD_ERROR_COMPONENTS_FIX.md for more options."
