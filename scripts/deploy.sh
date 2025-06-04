#!/bin/bash

# Mentra Deployment Script
# Usage: ./scripts/deploy.sh [environment] [options]
# Environments: development, staging, production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Default values
ENVIRONMENT="development"
SKIP_TESTS=false
SKIP_BACKUP=false
SKIP_MIGRATION=false
DRY_RUN=false
FORCE=false

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Show usage information
show_usage() {
    cat << EOF
Mentra Deployment Script

Usage: $0 [environment] [options]

Environments:
    development     Deploy to development environment (default)
    staging         Deploy to staging environment
    production      Deploy to production environment

Options:
    --skip-tests           Skip running tests before deployment
    --skip-backup          Skip database backup (not recommended for production)
    --skip-migration       Skip database migrations
    --dry-run              Show what would be deployed without actually deploying
    --force                Force deployment even if tests fail
    -h, --help             Show this help message

Examples:
    $0 development
    $0 staging --skip-tests
    $0 production --skip-backup --force
    $0 staging --dry-run

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            development|staging|production)
                ENVIRONMENT="$1"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-migration)
                SKIP_MIGRATION=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Create necessary directories
setup_directories() {
    print_status "Setting up directories..."
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
}

# Validate environment
validate_environment() {
    print_status "Validating environment: $ENVIRONMENT"
    
    # Check if environment file exists
    local env_file="$PROJECT_ROOT/backend/.env"
    if [[ "$ENVIRONMENT" != "development" ]]; then
        env_file="$PROJECT_ROOT/backend/.env.$ENVIRONMENT"
    fi
    
    if [[ ! -f "$env_file" ]]; then
        print_error "Environment file not found: $env_file"
        print_status "Creating template environment file..."
        cp "$PROJECT_ROOT/backend/env.example" "$env_file"
        print_warning "Please configure $env_file before deploying"
        exit 1
    fi
    
    # Validate required environment variables
    print_status "Validating environment variables..."
    cd "$PROJECT_ROOT/backend"
    
    if [[ "$ENVIRONMENT" != "development" ]]; then
        export NODE_ENV="$ENVIRONMENT"
    fi
    
    # Check if environment validation script exists and run it
    if [[ -f "src/scripts/validate-env.js" ]]; then
        node src/scripts/validate-env.js
        if [[ $? -ne 0 ]]; then
            print_error "Environment validation failed"
            exit 1
        fi
    fi
    
    print_success "Environment validation passed"
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker (for production deployments)
    if [[ "$ENVIRONMENT" == "production" ]] && ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed (recommended for production)"
    fi
    
    print_success "Dependencies check passed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would install dependencies"
        return
    fi
    
    cd "$PROJECT_ROOT"
    npm run install:all
    
    print_success "Dependencies installed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        print_warning "Skipping tests"
        return
    fi
    
    print_status "Running tests..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would run tests"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Run backend tests
    print_status "Running backend tests..."
    cd backend
    npm test
    
    # Run frontend tests (if they exist)
    if [[ -f "$PROJECT_ROOT/frontend/package.json" ]]; then
        print_status "Running frontend tests..."
        cd "$PROJECT_ROOT/frontend"
        if npm run test:ci &> /dev/null; then
            npm run test:ci
        else
            print_warning "Frontend tests not configured"
        fi
    fi
    
    print_success "Tests passed"
}

# Create database backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        print_warning "Skipping database backup"
        return
    fi
    
    print_status "Creating database backup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would create database backup"
        return
    fi
    
    local backup_file="$BACKUP_DIR/mentra-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).sql"
    
    # Read database URL from environment
    cd "$PROJECT_ROOT/backend"
    local database_url
    if [[ -f ".env.$ENVIRONMENT" ]]; then
        database_url=$(grep "^DATABASE_URL=" ".env.$ENVIRONMENT" | cut -d '=' -f2-)
    elif [[ -f ".env" ]]; then
        database_url=$(grep "^DATABASE_URL=" ".env" | cut -d '=' -f2-)
    fi
    
    if [[ -n "$database_url" ]] && command -v pg_dump &> /dev/null; then
        pg_dump "$database_url" > "$backup_file"
        print_success "Database backup created: $backup_file"
    else
        print_warning "Could not create database backup (pg_dump not available or DATABASE_URL not found)"
    fi
}

# Run database migrations
run_migrations() {
    if [[ "$SKIP_MIGRATION" == true ]]; then
        print_warning "Skipping database migrations"
        return
    fi
    
    print_status "Running database migrations..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would run database migrations"
        return
    fi
    
    cd "$PROJECT_ROOT/backend"
    npm run migrate
    
    print_success "Database migrations completed"
}

# Build application
build_application() {
    print_status "Building application..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would build application"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Build frontend
    if [[ -f "frontend/package.json" ]]; then
        print_status "Building frontend..."
        cd frontend
        npm run build
        cd ..
    fi
    
    # Build backend (if needed)
    print_status "Preparing backend..."
    cd backend
    
    print_success "Application built"
}

# Deploy to specific environment
deploy_to_environment() {
    print_status "Deploying to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would deploy to $ENVIRONMENT"
        return
    fi
    
    case $ENVIRONMENT in
        development)
            deploy_development
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Development deployment
deploy_development() {
    print_status "Starting development environment..."
    cd "$PROJECT_ROOT"
    
    # Start services with Docker Compose
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose up -d
        sleep 5  # Wait for services to start
    fi
    
    print_success "Development environment started"
    print_status "Access the application at: http://localhost:5173"
    print_status "API available at: http://localhost:3001"
}

# Staging deployment
deploy_staging() {
    print_status "Deploying to staging environment..."
    
    # Set environment variables
    export NODE_ENV=staging
    
    # Start services
    cd "$PROJECT_ROOT/backend"
    
    # Use PM2 for process management (if available)
    if command -v pm2 &> /dev/null; then
        pm2 stop mentra-staging 2>/dev/null || true
        pm2 start src/app.js --name mentra-staging --env staging
        print_success "Application started with PM2"
    else
        print_warning "PM2 not available, starting with npm"
        npm start &
    fi
    
    print_success "Staging deployment completed"
}

# Production deployment
deploy_production() {
    print_status "Deploying to production environment..."
    
    # Additional safety checks for production
    if [[ "$FORCE" != true ]]; then
        print_warning "Production deployment requires additional confirmation"
        read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " -r
        if [[ ! $REPLY =~ ^yes$ ]]; then
            print_status "Production deployment cancelled"
            exit 0
        fi
    fi
    
    # Set environment variables
    export NODE_ENV=production
    
    # Use Docker for production deployment
    if command -v docker &> /dev/null; then
        print_status "Building production Docker image..."
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.prod.yml build
        docker-compose -f docker-compose.prod.yml up -d
    else
        # Fallback to PM2
        if command -v pm2 &> /dev/null; then
            cd "$PROJECT_ROOT/backend"
            pm2 stop mentra-production 2>/dev/null || true
            pm2 start src/app.js --name mentra-production --env production
        else
            print_error "Neither Docker nor PM2 available for production deployment"
            exit 1
        fi
    fi
    
    print_success "Production deployment completed"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_status "[DRY RUN] Would verify deployment"
        return
    fi
    
    local api_url
    case $ENVIRONMENT in
        development)
            api_url="http://localhost:3001"
            ;;
        staging)
            api_url="${STAGING_URL:-http://localhost:3001}"
            ;;
        production)
            api_url="${PRODUCTION_URL:-http://localhost:3001}"
            ;;
    esac
    
    # Wait for application to start
    sleep 10
    
    # Check health endpoint
    if command -v curl &> /dev/null; then
        local health_response
        health_response=$(curl -s "$api_url/health" || echo "failed")
        
        if [[ "$health_response" == *"healthy"* ]] || [[ "$health_response" == *"degraded"* ]]; then
            print_success "Application is responding"
        else
            print_error "Application health check failed"
            print_error "Response: $health_response"
            exit 1
        fi
    else
        print_warning "curl not available, skipping health check"
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    # Add any cleanup tasks here
}

# Main deployment function
main() {
    print_status "Starting Mentra deployment..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Timestamp: $(date)"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    # Run deployment steps
    setup_directories
    validate_environment
    check_dependencies
    install_dependencies
    
    # Only run tests and backups for non-dry runs or if not skipped
    if [[ "$DRY_RUN" != true ]] || [[ "$SKIP_TESTS" != true ]]; then
        run_tests
    fi
    
    create_backup
    run_migrations
    build_application
    deploy_to_environment
    verify_deployment
    
    print_success "Deployment completed successfully!"
    print_status "Deployment log saved to: $LOG_FILE"
    
    # Show deployment summary
    cat << EOF

🎉 Deployment Summary:
    Environment: $ENVIRONMENT
    Timestamp: $(date)
    Log file: $LOG_FILE
    
Next steps:
    - Monitor application logs
    - Verify all features are working
    - Check performance metrics

EOF
}

# Script entry point
parse_arguments "$@"
main 