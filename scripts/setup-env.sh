#!/bin/bash

# Corporate Living App - Environment Setup Helper
# This script helps you set up your .env.local file interactively

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

print_error() {
    echo -e "${RED}✗ ${NC}$1"
}

# Print header
clear
echo "================================================"
echo "  Corporate Living App - Environment Setup"
echo "================================================"
echo ""

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    print_error "Error: .env.example not found!"
    print_info "Make sure you're running this from the project root directory."
    exit 1
fi

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    print_warning ".env.local already exists!"
    echo ""
    read -p "Do you want to overwrite it? (yes/no): " overwrite
    if [ "$overwrite" != "yes" ]; then
        print_info "Setup cancelled. Your existing .env.local was not changed."
        exit 0
    fi
fi

print_info "This script will help you create your .env.local file."
print_info "You'll need your Supabase credentials. Don't have them yet?"
print_info "Visit: https://supabase.com → Your Project → Settings → API"
echo ""
read -p "Press Enter to continue..."
echo ""

# Get Supabase URL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Step 1/3: Supabase Project URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Example: https://abcdefgh.supabase.co"
echo ""
read -p "Enter your Supabase URL: " SUPABASE_URL

# Validate URL format
if [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
    print_warning "URL doesn't look right. It should end with .supabase.co"
    read -p "Continue anyway? (yes/no): " continue
    if [ "$continue" != "yes" ]; then
        print_error "Setup cancelled."
        exit 1
    fi
fi

# Get Anon Key
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Step 2/3: Supabase Anon (Public) Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "This is the 'anon' key from your Supabase API settings"
print_info "It usually starts with 'eyJ...'"
echo ""
read -p "Enter your Anon Key: " ANON_KEY

# Get Service Role Key
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Step 3/3: Supabase Service Role Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_warning "WARNING: This is a SECRET key with admin access!"
print_info "This is the 'service_role' key from your Supabase API settings"
echo ""
read -p "Enter your Service Role Key: " SERVICE_KEY

# Optional: Email configuration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Optional: Email Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Do you want to configure email notifications now?"
print_info "(You can skip this and add it later)"
echo ""
read -p "Configure email? (yes/no): " configure_email

EMAIL_CONFIG=""
if [ "$configure_email" = "yes" ]; then
    echo ""
    print_info "Which email provider? (1=Resend, 2=SendGrid, 3=Skip)"
    read -p "Choice: " email_provider
    
    case $email_provider in
        1)
            read -p "Enter your Resend API key: " resend_key
            read -p "Enter your 'from' email address: " from_email
            EMAIL_CONFIG="
# Email Configuration (Resend)
RESEND_API_KEY=$resend_key
EMAIL_FROM=$from_email"
            ;;
        2)
            read -p "Enter your SendGrid API key: " sendgrid_key
            read -p "Enter your 'from' email address: " from_email
            EMAIL_CONFIG="
# Email Configuration (SendGrid)
SENDGRID_API_KEY=$sendgrid_key
EMAIL_FROM=$from_email"
            ;;
    esac
fi

# Create .env.local file
echo ""
print_info "Creating .env.local file..."

cat > .env.local << EOF
# Corporate Living App - Environment Variables
# Generated on $(date)

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
$EMAIL_CONFIG

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

print_success ".env.local file created successfully!"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Your .env.local file has been created with your credentials."
print_info "Next steps:"
echo "  1. Start the development server: npm run dev"
echo "  2. Visit: http://localhost:3000"
echo "  3. Check for any 'Supabase is not configured' errors"
echo ""
print_warning "IMPORTANT: Never commit .env.local to git!"
print_info "It's already in .gitignore, but be careful not to share it."
echo ""
print_success "Happy coding! 🚀"
