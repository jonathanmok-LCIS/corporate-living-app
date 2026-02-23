#!/bin/bash

echo "=========================================="
echo "FIX NESTED DIRECTORY STRUCTURE"
echo "=========================================="
echo ""

# Show current location
echo "Current directory:"
pwd
echo ""

# Check for nested structure
if [ -d "corporate-living-app" ]; then
    echo "⚠️  NESTED DIRECTORY DETECTED!"
    echo "You have a nested corporate-living-app/ directory."
    echo ""
    echo "Structure found:"
    echo "  $(pwd)/"
    echo "    └── corporate-living-app/  ← This shouldn't exist"
    echo ""
    
    # Check if nested directory has .git
    if [ -d "corporate-living-app/.git" ]; then
        echo "The nested directory contains a .git folder."
        echo "This is the actual repository."
        echo ""
        echo "SOLUTION: Move everything from nested directory to current directory"
        echo ""
        read -p "Do you want to fix this automatically? (y/n) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Fixing nested structure..."
            
            # Create a temporary backup
            echo "Creating backup..."
            cp -r corporate-living-app corporate-living-app-backup-$(date +%Y%m%d-%H%M%S)
            
            # Move everything from nested to current
            echo "Moving files from nested directory..."
            mv corporate-living-app/* . 2>/dev/null
            mv corporate-living-app/.[!.]* . 2>/dev/null
            
            # Remove the now-empty nested directory
            echo "Removing empty nested directory..."
            rm -rf corporate-living-app
            
            echo "✅ Structure fixed!"
            echo ""
        fi
    else
        echo "The nested directory doesn't contain .git"
        echo "You may want to remove it:"
        echo "  rm -rf corporate-living-app"
        echo ""
    fi
else
    echo "✅ No nested directory found. Structure looks good!"
    echo ""
fi

echo "Current directory contents:"
ls -la | head -20
echo ""

echo "Checking for old problematic files..."
OLD_FILES_FOUND=false

if [ -d "app/auth" ]; then
    echo "⚠️  Found: app/auth/ (should not exist)"
    OLD_FILES_FOUND=true
fi

if [ -d "app/dashboard" ]; then
    echo "⚠️  Found: app/dashboard/ (should not exist)"
    OLD_FILES_FOUND=true
fi

if [ -d "components/layout" ]; then
    echo "⚠️  Found: components/layout/ (should not exist)"
    OLD_FILES_FOUND=true
fi

if [ -d "utils/supabase" ]; then
    echo "⚠️  Found: utils/supabase/ (should not exist)"
    OLD_FILES_FOUND=true
fi

echo ""

if [ "$OLD_FILES_FOUND" = true ]; then
    echo "Found old files that need to be removed."
    echo ""
    read -p "Remove these old files? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing old files..."
        rm -rf app/auth
        rm -rf app/dashboard
        rm -rf components/layout
        rm -rf utils/supabase
        echo "✅ Old files removed!"
    fi
fi

echo ""
echo "=========================================="
echo "FINAL CLEANUP AND BUILD"
echo "=========================================="
echo ""

read -p "Run final cleanup and build? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning build artifacts..."
    rm -rf .next node_modules
    
    echo "Installing dependencies..."
    npm install
    
    echo "Building..."
    npm run build
    
    echo ""
    echo "=========================================="
    echo "DONE!"
    echo "=========================================="
else
    echo "Skipped. Run manually when ready:"
    echo "  rm -rf .next node_modules"
    echo "  npm install"
    echo "  npm run build"
fi
