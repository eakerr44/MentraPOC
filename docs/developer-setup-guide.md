# 🚀 Mentra Developer Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the Mentra AI-native learning platform development environment. Follow these instructions to get a fully functional development environment running on your local machine.

## ✅ Recent Stability Improvements

> **Great News!** Critical setup issues have been resolved (as of latest commits). The Mentra POC now runs successfully out-of-the-box.

### Issues Fixed ✅
- **Backend Crash Fixed:** `roleCheck is not a function` error that prevented backend startup
- **Frontend White Screen Fixed:** Missing essential files (`index.html`, `index.css`, React components) 
- **Database Error Fixed:** PostgreSQL session cleanup error resolved
- **Import Resolution Fixed:** All missing React components and stores added
- **Type Compatibility Fixed:** Dashboard component ID conversion issues resolved

### What This Means for You
- ✅ **Zero critical setup errors** when following this guide
- ✅ **Immediate functionality** after setup completion
- ✅ **All components working** - login, dashboards, navigation
- ✅ **Complete end-to-end flow** from setup to running application
- ✅ **Comprehensive troubleshooting** documentation for any edge cases

If you encounter any of the previously documented critical errors, they have been resolved in the latest codebase. See the [troubleshooting guide](./troubleshooting-guide.md#critical-setup-issues-recently-fixed) for details.

---

## �� Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Operating System** | macOS 10.15+, Ubuntu 18.04+, Windows 10+ | macOS 12+, Ubuntu 20.04+, Windows 11 |
| **Node.js** | 18.0.0+ | 20.0.0+ |
| **RAM** | 8GB | 16GB+ |
| **Storage** | 10GB free space | 20GB+ free space |
| **Network** | Stable internet for downloads | High-speed internet |

### Required Software

#### 1. Node.js & npm
```bash
# Check if Node.js is installed
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher

# Install Node.js if needed
# Visit https://nodejs.org/ or use a version manager like nvm
```

#### 2. Docker & Docker Compose
```bash
# Check Docker installation
docker --version          # Should be 20.0.0 or higher
docker-compose --version  # Should be 2.0.0 or higher

# Install Docker Desktop from https://docker.com/products/docker-desktop
# Or install Docker Engine on Linux
```

#### 3. Git
```bash
# Check Git installation
git --version  # Should be 2.30.0 or higher

# Install from https://git-scm.com/downloads if needed
```

#### 4. Code Editor (Recommended)
- **Visual Studio Code** with extensions:
  - TypeScript and JavaScript Language Features
  - Prettier - Code formatter
  - ESLint
  - Thunder Client (API testing)
  - Docker

### Optional Tools
- **Postman** - For API testing (alternative to Thunder Client)
- **TablePlus** or **pgAdmin** - For database management
- **jq** - For JSON processing in terminal

---

## 🎯 Quick Start (5 Minutes)

For experienced developers who want to get started immediately:

```bash
# 1. Clone the repository
git clone https://github.com/mentra-ai/proof-of-concept.git
cd mentra-proof-of-concept

# 2. Install dependencies
npm run install:all

# 3. Setup environment
npm run env:setup

# 4. Start services
npm run docker:up

# 5. Run migrations
npm run migrate

# 6. Start development servers
npm run dev
```

**That's it!** Your development environment should now be running:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/v1

---

## 📚 Detailed Setup Instructions

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/mentra-ai/proof-of-concept.git
cd mentra-proof-of-concept

# Verify project structure
ls -la
# Should see: backend/, frontend/, database/, docs/, scripts/, etc.
```

### Step 2: Install Dependencies

#### Install Root Dependencies
```bash
# Install root workspace dependencies
npm install

# Verify installation
npm list --depth=0
```

#### Install All Workspace Dependencies
```bash
# Install backend and frontend dependencies
npm run install:all

# This runs:
# - npm install (root)
# - npm install --prefix backend
# - npm install --prefix frontend
```

#### Verify Installations
```bash
# Check backend dependencies
cd backend && npm list --depth=0

# Check frontend dependencies  
cd ../frontend && npm list --depth=0

# Return to root
cd ..
```

### Step 3: Environment Configuration

#### Automatic Setup (Recommended)
```bash
# Generate environment files with secure secrets
npm run env:setup

# This creates:
# - backend/.env (development configuration)
# - Secure JWT secrets
# - Database passwords
```

#### Manual Setup (Advanced)
```bash
# Copy environment template
cp backend/env.example backend/.env

# Edit the file with your preferred editor
code backend/.env  # VS Code
# OR
nano backend/.env  # Terminal editor
```

#### Required Environment Variables

Edit `backend/.env` and configure these key variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://mentra_user:mentra_dev_password@localhost:5432/mentra_dev

# JWT Security (CHANGE THESE!)
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_in_production
SESSION_SECRET=your_session_secret_change_in_production

# AI Configuration (Optional for basic setup)
AI_API_KEY=your_ai_api_key_here
AI_MODEL=llama2

# Vector Database
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

#### Validate Configuration
```bash
# Test environment configuration
npm run env:validate

# Should output: ✅ Environment validation passed
```

### Step 4: Database Setup

#### Start Database Services
```bash
# Start PostgreSQL, ChromaDB, and Redis
npm run docker:up

# Check services are running
docker ps
# Should show: mentra-postgres, mentra-chroma, mentra-redis
```

#### Verify Database Connections
```bash
# Test PostgreSQL connection
docker exec -it mentra-postgres psql -U mentra_user -d mentra_dev -c "SELECT version();"

# Test ChromaDB connection
curl http://localhost:8000/api/v1/heartbeat

# Test Redis connection
docker exec -it mentra-redis redis-cli ping
# Should return: PONG
```

#### Run Database Migrations
```bash
# Create database schema and seed data
npm run migrate

# This runs all migration files in database/migrations/
# Expected output: "✅ All migrations completed successfully"
```

### Step 5: Start Development Servers

#### Start Both Servers
```bash
# Start backend and frontend simultaneously
npm run dev

# This runs:
# - Backend server on http://localhost:3001
# - Frontend server on http://localhost:5173
```

#### Start Servers Individually (Debugging)
```bash
# Terminal 1: Start backend only
cd backend && npm run dev

# Terminal 2: Start frontend only
cd frontend && npm run dev
```

### Step 6: Verify Installation

#### Health Checks
```bash
# Check backend health
npm run health:check
# OR
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "web_server": "running",
    "database": "connected",
    "vector_database": "connected"
  }
}
```

#### Frontend Access
1. Open browser to http://localhost:5173
2. You should see the Mentra application
3. Try creating a test account

#### API Testing
```bash
# Test user registration
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "role": "student",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## 🛠️ Development Workflow

### Daily Development Commands

```bash
# Start development environment
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Build for production (testing)
npm run build

# View logs
npm run logs:backend
npm run docker:logs
```

### Database Commands

```bash
# Apply new migrations
npm run migrate

# Reset database (warning: deletes all data)
docker-compose down -v
docker-compose up -d
npm run migrate

# Backup database
npm run backup:create

# Restore database
npm run backup:restore
```

### Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Rebuild containers
npm run docker:build

# Remove volumes (reset data)
docker-compose down -v
```

---

## 🧪 Testing Setup

### Running Tests

```bash
# Run all tests
npm run test

# Run backend tests only
cd backend && npm test

# Run frontend tests only
cd frontend && npm test

# Run tests in watch mode
cd backend && npm run test:watch
cd frontend && npm run test:watch
```

### Test Database Setup

Tests use a separate test database. To set up:

```bash
# Create test environment file
cp backend/.env backend/.env.test

# Update database name in .env.test
sed -i 's/mentra_dev/mentra_test/g' backend/.env.test

# Create test database
docker exec -it mentra-postgres createdb -U mentra_user mentra_test

# Run test migrations
NODE_ENV=test npm run migrate
```

---

## 🔧 IDE Setup

### Visual Studio Code

#### Recommended Extensions
Install these extensions for the best development experience:

```bash
# Install via VS Code Extensions marketplace:
# - TypeScript and JavaScript Language Features
# - Prettier - Code formatter  
# - ESLint
# - Thunder Client
# - Docker
# - PostgreSQL
# - Tailwind CSS IntelliSense
```

#### Workspace Settings
Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "files.associations": {
    "*.mdc": "markdown"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  }
}
```

#### Debug Configuration
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/app.js",
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/backend/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 🐛 Common Issues & Solutions

### Installation Issues

#### Node.js Version Conflicts
```bash
# Error: Node version not supported
# Solution: Use Node Version Manager (nvm)

# Install nvm (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 20
nvm install 20
nvm use 20
nvm alias default 20
```

#### Permission Errors
```bash
# Error: EACCES permission denied
# Solution: Fix npm permissions

# Create npm global directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to ~/.bashrc or ~/.zshrc
export PATH=~/.npm-global/bin:$PATH

# Restart terminal and reinstall
```

### Docker Issues

#### Port Conflicts
```bash
# Error: Port 5432 already in use
# Solution: Stop conflicting services

# Find process using port
lsof -i :5432

# Stop local PostgreSQL (macOS)
brew services stop postgresql

# Or change port in docker-compose.yml
```

#### Docker Not Starting
```bash
# Error: Cannot connect to Docker daemon
# Solution: Start Docker Desktop

# macOS: Start Docker Desktop app
# Linux: Start Docker service
sudo systemctl start docker

# Windows: Start Docker Desktop
```

### Database Issues

#### Migration Failures
```bash
# Error: Migration failed
# Solution: Reset and retry

# Check database connection first
npm run health:check

# Reset migrations
docker exec -it mentra-postgres psql -U mentra_user -d mentra_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Retry migration
npm run migrate
```

#### Connection Refused
```bash
# Error: ECONNREFUSED connecting to database
# Solution: Verify services

# Check Docker containers
docker ps

# Restart database
docker-compose restart postgres

# Check environment variables
cat backend/.env | grep DATABASE
```

### Frontend Issues

#### Module Not Found
```bash
# Error: Module not found
# Solution: Clear cache and reinstall

# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf frontend/node_modules

# Reinstall
cd frontend && npm install
```

#### Port Already in Use
```bash
# Error: Port 5173 already in use
# Solution: Kill process or change port

# Find and kill process
lsof -ti:5173 | xargs kill -9

# Or change port in frontend/vite.config.ts
```

---

## 📊 Performance Optimization

### Development Performance

#### Faster Builds
```bash
# Use npm scripts for optimal performance
npm run dev  # Uses optimized concurrently setup

# Enable TypeScript incremental compilation
# Add to tsconfig.json:
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

#### Database Performance
```bash
# Use indices in development
# Migrations automatically create indices

# Monitor query performance
# Add to backend/.env:
LOG_LEVEL=debug
```

### Memory Usage
```bash
# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"

# Or set in package.json scripts:
"dev": "NODE_OPTIONS='--max-old-space-size=4096' node src/app.js"
```

---

## 🚀 Next Steps

### Development Tasks
1. **Read the Architecture Documentation**
   - Review `docs/api-documentation.md`
   - Study the database schema in `database/migrations/`

2. **Explore the Codebase**
   - Backend services in `backend/src/services/`
   - Frontend components in `frontend/src/components/`
   - API routes in `backend/src/routes/`

3. **Run the Test Suite**
   - `npm run test` to ensure everything works
   - Review test files to understand expected behavior

4. **Try the Features**
   - Create test accounts for student, teacher, parent roles
   - Test the dashboard functionality
   - Experiment with the AI features

### Contributing
1. **Set up Git hooks**
   ```bash
   # Install husky for pre-commit hooks
   npx husky install
   ```

2. **Follow coding standards**
   - Use Prettier for formatting
   - Follow ESLint rules
   - Write tests for new features

3. **Development workflow**
   - Create feature branches
   - Write descriptive commit messages
   - Submit pull requests with tests

---

## 🔗 Additional Resources

### Documentation Links
- [API Documentation](api-documentation.md)
- [Authentication Guide](authentication-guide.md)
- [Administrator Guide](administrator-installation-guide.md)

### External Resources
- [Node.js Documentation](https://nodejs.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://typescriptlang.org/docs/)

### Community
- Project Repository: https://github.com/mentra-ai/proof-of-concept
- Issue Tracker: Use GitHub Issues for bug reports
- Development Chat: Contact the team for access

---

**🎉 Congratulations!** You now have a fully functional Mentra development environment. Happy coding!

*Last Updated: January 15, 2024* 