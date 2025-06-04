#!/bin/bash

# Mentra Environment Setup Script
# Usage: ./scripts/setup-env.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    cat << EOF
Mentra Environment Setup Script

Usage: $0 [environment]

Environments:
    development     Set up development environment (default)
    staging         Set up staging environment
    production      Set up production environment
    all             Set up all environments

This script helps you set up environment configuration files by:
1. Copying template files to actual environment files
2. Generating secure secrets for JWT and other services
3. Providing guidance for manual configuration steps

Examples:
    $0                  # Set up development environment
    $0 staging          # Set up staging environment
    $0 production       # Set up production environment
    $0 all              # Set up all environments

EOF
}

# Generate a secure random string
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Generate JWT secret (minimum 64 characters)
generate_jwt_secret() {
    generate_secret 64
}

# Generate database password
generate_db_password() {
    generate_secret 32
}

# Setup development environment
setup_development() {
    print_status "Setting up development environment..."
    
    local env_file="$BACKEND_DIR/.env"
    
    if [[ -f "$env_file" ]]; then
        print_warning "Development .env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Skipping development environment setup"
            return
        fi
    fi
    
    # Copy template
    cp "$BACKEND_DIR/env.example" "$env_file"
    
    # Generate secrets
    local jwt_secret=$(generate_jwt_secret)
    local db_password=$(generate_db_password)
    
    # Update secrets in the file
    if command -v sed &> /dev/null; then
        sed -i.bak "s/your_jwt_secret_change_in_production/$jwt_secret/g" "$env_file"
        sed -i.bak "s/mentra_dev_password/$db_password/g" "$env_file"
        rm -f "$env_file.bak"
    else
        print_warning "sed not available. Please manually update JWT_SECRET and database passwords in $env_file"
    fi
    
    print_success "Development environment file created: $env_file"
    print_status "Generated JWT_SECRET and database password"
}

# Setup staging environment
setup_staging() {
    print_status "Setting up staging environment..."
    
    local env_file="$BACKEND_DIR/.env.staging"
    local template_file="$BACKEND_DIR/env.staging.template"
    
    if [[ ! -f "$template_file" ]]; then
        print_error "Staging template file not found: $template_file"
        return 1
    fi
    
    if [[ -f "$env_file" ]]; then
        print_warning "Staging .env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Skipping staging environment setup"
            return
        fi
    fi
    
    # Copy template
    cp "$template_file" "$env_file"
    
    # Generate secrets
    local jwt_secret=$(generate_jwt_secret)
    local db_password=$(generate_db_password)
    local session_secret=$(generate_secret 32)
    local chroma_token=$(generate_secret 32)
    local redis_password=$(generate_secret 24)
    
    # Update secrets in the file
    if command -v sed &> /dev/null; then
        sed -i.bak "s/CHANGE_IN_STAGING_super_secure_jwt_secret_key_here/$jwt_secret/g" "$env_file"
        sed -i.bak "s/CHANGE_IN_STAGING/$db_password/g" "$env_file"
        sed -i.bak "s/CHANGE_IN_STAGING_session_secret/$session_secret/g" "$env_file"
        sed -i.bak "s/CHANGE_IN_STAGING/$chroma_token/g" "$env_file"
        sed -i.bak "s/CHANGE_IN_STAGING/$redis_password/g" "$env_file"
        rm -f "$env_file.bak"
    else
        print_warning "sed not available. Please manually update secrets in $env_file"
    fi
    
    print_success "Staging environment file created: $env_file"
    print_warning "Please update the following manually:"
    print_warning "  - Database connection details"
    print_warning "  - AI API keys"
    print_warning "  - Email configuration"
    print_warning "  - External service URLs"
}

# Setup production environment
setup_production() {
    print_status "Setting up production environment..."
    
    local env_file="$BACKEND_DIR/.env.production"
    local template_file="$BACKEND_DIR/env.production.template"
    
    if [[ ! -f "$template_file" ]]; then
        print_error "Production template file not found: $template_file"
        return 1
    fi
    
    if [[ -f "$env_file" ]]; then
        print_error "Production .env file already exists: $env_file"
        print_error "For security reasons, please manually create production environment files"
        return 1
    fi
    
    print_warning "Production environment setup requires manual configuration"
    print_status "Creating production template copy..."
    
    # Copy template with a different name to avoid accidental use
    cp "$template_file" "$BACKEND_DIR/.env.production.template-copy"
    
    print_success "Production template copied to: $BACKEND_DIR/.env.production.template-copy"
    
    echo ""
    print_warning "🔒 PRODUCTION SECURITY CHECKLIST:"
    echo "1. Copy .env.production.template-copy to .env.production"
    echo "2. Generate strong, unique secrets for:"
    echo "   - JWT_SECRET (minimum 64 characters)"
    echo "   - Database passwords"
    echo "   - Redis password" 
    echo "   - ChromaDB auth token"
    echo "   - Session secret"
    echo "3. Configure external services:"
    echo "   - Database connection"
    echo "   - AI service API keys"
    echo "   - Email service credentials"
    echo "   - Monitoring service keys (Sentry, New Relic, etc.)"
    echo "4. Update URLs and endpoints"
    echo "5. Review and adjust security settings"
    echo "6. Test configuration with: npm run validate-env"
    echo ""
}

# Setup directories
setup_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$BACKEND_DIR/logs"
    
    print_success "Directories created"
}

# Main setup function
main() {
    local environment=${1:-development}
    
    print_status "Starting Mentra environment setup..."
    print_status "Target environment: $environment"
    echo ""
    
    # Check prerequisites
    if ! command -v openssl &> /dev/null; then
        print_error "openssl is required for generating secure secrets"
        exit 1
    fi
    
    # Setup directories
    setup_directories
    
    # Setup specific environment
    case $environment in
        development)
            setup_development
            ;;
        staging)
            setup_staging
            ;;
        production)
            setup_production
            ;;
        all)
            setup_development
            setup_staging
            setup_production
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown environment: $environment"
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Environment setup completed!"
    echo ""
    print_status "Next steps:"
    echo "1. Review and update environment variables as needed"
    echo "2. Start required services (PostgreSQL, ChromaDB)"
    echo "3. Run database migrations: npm run migrate"
    echo "4. Validate configuration: npm run env:validate"
    echo "5. Start the application: npm run dev"
    echo ""
}

# Check if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 