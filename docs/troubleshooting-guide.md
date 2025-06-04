# 🔧 Mentra Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered during installation, development, and deployment of the Mentra AI-native learning platform. Use this as your first resource when encountering problems.

## 📚 Quick Reference

### Emergency Commands
```bash
# Health check
npm run health:check

# Restart all services
npm run docker:down && npm run docker:up

# Check logs
npm run logs:backend
npm run docker:logs

# Reset development environment
docker-compose down -v && npm run migrate

# Emergency production rollback
sudo systemctl stop mentra
mv /opt/mentra-backup-YYYYMMDD /opt/mentra
sudo systemctl start mentra
```

### Status Check Commands
```bash
# Check service status
docker ps                    # Docker containers
sudo systemctl status mentra # Production service
pm2 status                   # PM2 processes
sudo systemctl status nginx  # Nginx status
sudo systemctl status postgresql # Database status
```

---

## 🚀 Installation Issues

### Node.js Issues

#### Problem: "Node version not supported"
```bash
# Error message
error mentra@1.0.0: The engine "node" is incompatible with this module.

# Solution 1: Use Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Solution 2: Update Node.js directly
# Visit https://nodejs.org/en/download/
# Or use your package manager
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Problem: "npm EACCES permission denied"
```bash
# Error message
Error: EACCES: permission denied, access '/usr/local/lib/node_modules'

# Solution: Configure npm to use different directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile

# Alternative: Fix permissions (not recommended)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

#### Problem: "gyp ERR! build error" on npm install
```bash
# Error message
gyp ERR! build error
gyp ERR! stack Error: `make` failed with exit code: 2

# Solution: Install build tools
# Ubuntu/Debian
sudo apt-get install build-essential python3

# macOS
xcode-select --install

# Clean and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues

#### Problem: "Cannot connect to the Docker daemon"
```bash
# Error message
Cannot connect to the Docker daemon at unix:///var/run/docker.sock

# Solution 1: Start Docker Desktop (macOS/Windows)
# Start Docker Desktop application

# Solution 2: Start Docker service (Linux)
sudo systemctl start docker
sudo systemctl enable docker

# Solution 3: Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in
```

#### Problem: "Port already in use"
```bash
# Error message
Error starting userland proxy: listen tcp 0.0.0.0:5432: bind: address already in use

# Solution 1: Find and stop the process
sudo lsof -i :5432
sudo kill -9 PID_NUMBER

# Solution 2: Stop local PostgreSQL
# macOS
brew services stop postgresql

# Linux
sudo systemctl stop postgresql

# Solution 3: Change port in docker-compose.yml
ports:
  - "5433:5432"  # Use different host port
```

#### Problem: "No space left on device"
```bash
# Error message
no space left on device

# Solution 1: Clean Docker resources
docker system prune -a --volumes
docker image prune -a

# Solution 2: Remove unused containers
docker container prune

# Solution 3: Check disk space
df -h
du -sh /var/lib/docker
```

### Dependency Issues

#### Problem: "Module not found" errors
```bash
# Error message
Error: Cannot find module 'express'

# Solution 1: Install missing dependencies
cd backend && npm install
cd frontend && npm install

# Solution 2: Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Solution 3: Check package.json
cat package.json  # Verify dependencies are listed
```

#### Problem: "Version conflict" in package-lock.json
```bash
# Error message
npm ERR! peer dep missing

# Solution 1: Delete lock file and reinstall
rm package-lock.json
npm install

# Solution 2: Update dependencies
npm update

# Solution 3: Fix peer dependencies
npm install --legacy-peer-deps
```

---

## 🗄️ Database Issues

### Connection Issues

#### Problem: "Connection refused" to PostgreSQL
```bash
# Error message
Error: connect ECONNREFUSED 127.0.0.1:5432

# Solution 1: Check if PostgreSQL is running
docker ps | grep postgres
sudo systemctl status postgresql

# Solution 2: Start PostgreSQL
docker-compose up -d postgres
sudo systemctl start postgresql

# Solution 3: Check connection parameters
cat backend/.env | grep DATABASE_URL
# Verify host, port, username, password

# Solution 4: Test connection manually
psql postgresql://mentra_user:password@localhost:5432/mentra_dev
# Or with Docker
docker exec -it mentra-postgres psql -U mentra_user -d mentra_dev
```

#### Problem: "password authentication failed"
```bash
# Error message
FATAL: password authentication failed for user "mentra_user"

# Solution 1: Reset password
docker exec -it mentra-postgres psql -U postgres
ALTER USER mentra_user WITH PASSWORD 'new_password';

# Solution 2: Check environment variables
cat backend/.env | grep POSTGRES_PASSWORD

# Solution 3: Recreate user
DROP USER IF EXISTS mentra_user;
CREATE USER mentra_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mentra_dev TO mentra_user;
```

### Migration Issues

#### Problem: "Migration failed" during npm run migrate
```bash
# Error message
Migration failed: relation "users" already exists

# Solution 1: Check migration status
cd backend && node src/scripts/migrate.js --status

# Solution 2: Reset migrations (WARNING: Deletes all data)
docker exec -it mentra-postgres psql -U mentra_user -d mentra_dev
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Re-run migrations
npm run migrate

# Solution 3: Manual migration
cd backend
node src/scripts/migrate.js --migration 001
```

#### Problem: "Out of disk space" during migration
```bash
# Error message
ERROR: could not extend file "base/16384/16389": No space left on device

# Solution 1: Check disk space
df -h
docker system df

# Solution 2: Clean up space
docker system prune -a
sudo journalctl --vacuum-time=3d

# Solution 3: Increase disk space or mount larger volume
```

### Performance Issues

#### Problem: Slow database queries
```bash
# Solution 1: Enable query logging
# Add to postgresql.conf:
log_statement = 'all'
log_min_duration_statement = 1000

# Solution 2: Check for missing indexes
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename = 'your_table_name';

# Solution 3: Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

#### Problem: High memory usage by PostgreSQL
```bash
# Solution 1: Tune PostgreSQL configuration
# Edit postgresql.conf:
shared_buffers = 128MB      # 25% of RAM
effective_cache_size = 1GB  # 75% of RAM
work_mem = 4MB
maintenance_work_mem = 64MB

# Solution 2: Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Backup Restoration

```bash
# Create database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
pg_restore --dbname=mentra_production backup_file.sql.gz

# Run rollback migrations
npm run migrate:rollback
```

---

## 🔗 API & Network Issues

### API Connection Issues

#### Problem: "Cannot reach API endpoints"
```bash
# Error message
Network Error: Request failed with status code 503

# Solution 1: Check if backend is running
curl http://localhost:3001/health
npm run health:check

# Solution 2: Check backend logs
npm run logs:backend
tail -f backend/logs/mentra.log

# Solution 3: Verify environment variables
cat backend/.env | grep PORT
cat frontend/.env | grep VITE_API_URL
```

#### Problem: "CORS errors" in browser
```bash
# Error message
Access to fetch at 'http://localhost:3001' has been blocked by CORS policy

# Solution 1: Check CORS configuration in backend
# backend/src/app.js should have proper CORS setup

# Solution 2: Verify frontend URL in backend/.env
FRONTEND_URL=http://localhost:5173

# Solution 3: Check if both servers are running
curl http://localhost:3001/health
curl http://localhost:5173
```

#### Problem: "401 Unauthorized" errors
```bash
# Error message
Request failed with status code 401

# Solution 1: Check JWT token in localStorage
# Open browser dev tools > Application > Local Storage
# Look for 'accessToken'

# Solution 2: Try logging in again
# Clear localStorage and log in fresh

# Solution 3: Check JWT secret configuration
cat backend/.env | grep JWT_SECRET
# Ensure it's not the default value
```

### SSL/HTTPS Issues

#### Problem: "SSL certificate errors" in production
```bash
# Error message
SSL_ERROR_BAD_CERT_DOMAIN

# Solution 1: Check certificate validity
openssl x509 -in /etc/letsencrypt/live/domain.com/cert.pem -text -noout

# Solution 2: Renew Let's Encrypt certificate
sudo certbot renew --force-renewal

# Solution 3: Check Nginx configuration
sudo nginx -t
sudo nginx -s reload
```

#### Problem: "Mixed content" warnings
```bash
# Error message
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource

# Solution 1: Update all URLs to HTTPS
# Check frontend configuration
cat frontend/.env | grep VITE_API_URL
# Should be https:// not http://

# Solution 2: Check API calls in code
grep -r "http://" frontend/src/
```

---

## 🖥️ Frontend Issues

### Build Issues

#### Problem: "Build failed" during npm run build
```bash
# Error message
Build failed with 1 error

# Solution 1: Check detailed error logs
cd frontend && npm run build 2>&1 | tee build.log

# Solution 2: Clear cache and rebuild
rm -rf frontend/dist frontend/node_modules
cd frontend && npm install
npm run build

# Solution 3: Check TypeScript errors
cd frontend && npm run type-check
```

#### Problem: "Out of memory" during build
```bash
# Error message
FATAL ERROR: Ineffective mark-compacts near heap limit

# Solution 1: Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Solution 2: Add to package.json
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
}

# Solution 3: Build in stages if necessary
npm run build:types
npm run build:assets
```

### Runtime Issues

#### Problem: "White screen" in browser
```bash
# Solution 1: Check browser console for errors
# Open Developer Tools > Console

# Solution 2: Check if assets are loading
# Network tab should show successful loading of JS/CSS

# Solution 3: Check build output
ls -la frontend/dist/
# Should contain index.html and assets/

# Solution 4: Check Vite configuration
cat frontend/vite.config.ts
```

#### Problem: "Hot reload not working" in development
```bash
# Solution 1: Check Vite dev server
cd frontend && npm run dev
# Should show "Local: http://localhost:5173"

# Solution 2: Check file watchers
# macOS: might need to increase file watch limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Solution 3: Restart dev server
cd frontend && npm run dev -- --force
```

---

## 🚨 Critical Setup Issues (Recently Fixed)

> **Important:** These are critical issues that were discovered and fixed in the Mentra POC. These fixes prevent complete application failure.

### Backend Crashes

#### Problem: "TypeError: roleCheck is not a function"
```bash
# Error message
TypeError: roleCheck is not a function
    at Object.<anonymous> (/path/to/backend/src/routes/dashboard.js:27:50)

# Root Cause
The roleCheck function was imported but never defined/exported in the middleware file.

# Symptoms
- Backend crashes immediately on startup
- All API endpoints fail to load
- Complete application failure

# Solution 1: Verify roleCheck function exists
cat backend/src/middleware/role-check.js
# Should contain proper roleCheck function definition and export

# Solution 2: If missing, the function should be:
```javascript
const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { roleCheck };
```

# Solution 3: Restart backend after fix
cd backend && npm run dev
```

#### Problem: "Database session cleanup error - aggregate functions not allowed"
```bash
# Error message
Failed to cleanup expired sessions: Error
aggregate functions are not allowed in RETURNING

# Root Cause
PostgreSQL doesn't allow COUNT(*) in RETURNING clause of DELETE statements.

# Symptoms
- Backend starts but shows database error
- Session cleanup fails
- May cause memory leaks over time

# Solution: Update auth-service.js cleanup query
# Change from:
DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP RETURNING COUNT(*) as cleaned_count

# To:
DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP

# Fix automatically applied in auth-service.js - should not occur in fresh installations
```

### Frontend White Screen Issues

#### Problem: "Frontend shows only white screen with no content"
```bash
# Symptoms
- Browser shows completely blank page
- No error messages in console
- Vite dev server runs but serves empty content

# Root Cause 1: Missing index.html
ls -la frontend/index.html
# If missing, creates Vite build failure

# Solution 1: Create frontend/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mentra - AI-Native Learning Platform</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root">
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p>Loading Mentra...</p>
      </div>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

# Root Cause 2: Missing index.css
ls -la frontend/src/index.css
# If missing, creates import resolution failure

# Solution 2: Create frontend/src/index.css with base styles
# (File contains 400+ lines of essential CSS - see fixed version)
```

#### Problem: "Module resolution failures - Cannot resolve import"
```bash
# Error messages
Failed to resolve import "./pages/LoginPage" from "src/App.tsx"
Failed to resolve import "./stores/authStore" from various files

# Root Cause
Essential React components and stores were missing from the frontend.

# Missing Files Checklist:
ls -la frontend/src/pages/LoginPage.tsx      # Login interface
ls -la frontend/src/pages/DashboardPage.tsx # Dashboard routing  
ls -la frontend/src/pages/ProblemsPage.tsx  # Problem solving interface
ls -la frontend/src/components/Layout.tsx   # App layout wrapper
ls -la frontend/src/stores/authStore.ts     # Authentication state management

# Solution: All missing components have been created
# Check git log for commits containing these fixes
git log --oneline | grep -E "(frontend|components|missing)"
```

#### Problem: "Dashboard components require numeric IDs but receive strings"
```bash
# Error message
Property 'userId' expects number but received string

# Root Cause
Demo auth system generates string IDs but dashboard components expect numbers.

# Solution: ID conversion in DashboardPage.tsx
const numericId = parseInt(user.id.split('-').pop() || '1', 10) || 1;

# Fixed in DashboardPage component - passes converted numeric IDs to dashboards
```

### Recovery After These Fixes

#### Complete Recovery Verification
```bash
# 1. Verify backend starts without errors
cd backend && npm run dev
# Should show "Mentra backend running on http://localhost:3001"

# 2. Verify frontend builds and runs
cd frontend && npm run dev  
# Should show "Local: http://localhost:5173/"

# 3. Test end-to-end functionality
curl http://localhost:3001/health
curl http://localhost:5173
# Both should return successful responses

# 4. Verify all components load
# Open browser to http://localhost:5173
# Should show Mentra login page, not white screen
```

#### Signs of Successful Fix
- ✅ Backend starts without crashes
- ✅ Frontend serves actual HTML content
- ✅ Login page displays properly
- ✅ Dashboard routing works for all user types
- ✅ No import resolution errors in console
- ✅ Vite hot reload functions properly

---

## �� AI Service Issues

### AI Connection Issues

#### Problem: "AI service unavailable"
```bash
# Error message
Error: AI service is not responding

# Solution 1: Check AI configuration
cat backend/.env | grep AI_
# Verify API_KEY, ENDPOINT, MODEL are set

# Solution 2: Test AI endpoint manually
curl -H "Authorization: Bearer $AI_API_KEY" \
  https://api.openai.com/v1/models

# Solution 3: Check local AI service (if using Ollama)
curl http://localhost:11434/api/tags
```

#### Problem: "API rate limit exceeded"
```bash
# Error message
Rate limit exceeded for API calls

# Solution 1: Check current rate limits
# Review your AI service dashboard

# Solution 2: Implement exponential backoff
# Already implemented in backend/src/services/ai-service.js

# Solution 3: Reduce AI call frequency
# Check backend logs for excessive calls
grep "AI request" backend/logs/mentra.log | wc -l
```

### Vector Database Issues

#### Problem: "ChromaDB connection failed"
```bash
# Error message
Error: Failed to connect to ChromaDB

# Solution 1: Check if ChromaDB is running
docker ps | grep chroma
curl http://localhost:8000/api/v1/heartbeat

# Solution 2: Restart ChromaDB
docker-compose restart chroma

# Solution 3: Check ChromaDB logs
docker logs mentra-chroma
```

---

## 🔄 Environment Issues

### Development vs Production

#### Problem: "Works in development but not production"
```bash
# Solution 1: Compare environment variables
diff backend/.env backend/.env.production

# Solution 2: Check NODE_ENV
echo $NODE_ENV
cat backend/.env.production | grep NODE_ENV

# Solution 3: Check production logs
tail -f /opt/mentra/logs/mentra.log
sudo journalctl -u mentra -f
```

#### Problem: "Environment variables not loading"
```bash
# Solution 1: Check file permissions
ls -la backend/.env
# Should be readable by application user

# Solution 2: Verify dotenv configuration
# Check if dotenv is properly configured in app.js

# Solution 3: Test environment loading
cd backend && node -e "
require('dotenv').config();
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
"
```

### Configuration Issues

#### Problem: "Invalid configuration" errors
```bash
# Solution 1: Validate environment file
npm run env:validate

# Solution 2: Check required variables
cd backend && node -e "
const config = require('./src/config/environment');
console.log('Config loaded successfully');
"

# Solution 3: Use environment templates
cp backend/env.example backend/.env
# Edit with correct values
```

---

## 📊 Performance Issues

### High Memory Usage

#### Problem: "Application running out of memory"
```bash
# Solution 1: Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Solution 2: Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Solution 3: Check for memory leaks
cd backend && node --inspect src/app.js
# Use Chrome DevTools for profiling

# Solution 4: Restart services periodically
# Add to crontab for production:
# 0 3 * * * systemctl restart mentra
```

### High CPU Usage

#### Problem: "High CPU usage"
```bash
# Solution 1: Check CPU usage by process
top -p $(pgrep -f "node.*mentra")
htop

# Solution 2: Profile the application
cd backend && node --prof src/app.js
# Generate profile report
node --prof-process isolate-*-v8.log > profile.txt

# Solution 3: Check for infinite loops
# Review recent code changes
# Check logs for repeated error messages
```

### Slow Response Times

#### Problem: "API responses are slow"
```bash
# Solution 1: Check database query performance
# Enable slow query logging in PostgreSQL
log_min_duration_statement = 1000

# Solution 2: Check network latency
ping api.mentra.com
curl -w "@curl-format.txt" -o /dev/null -s https://api.mentra.com/health

# Solution 3: Add response time logging
# Check backend/src/middleware/logging.js for timing
```

---

## 🚨 Emergency Procedures

### System Recovery

#### Complete System Failure
```bash
# 1. Check all services
docker ps -a
sudo systemctl status mentra postgresql nginx

# 2. Restart in order
sudo systemctl restart postgresql
docker-compose restart
sudo systemctl restart mentra
sudo systemctl restart nginx

# 3. Verify recovery
npm run health:check
curl https://api.mentra.com/health
```

#### Database Corruption
```bash
# 1. Stop all services
sudo systemctl stop mentra
docker-compose stop

# 2. Restore from backup
cp /opt/mentra/backups/db_latest.sql.gz /tmp/
gunzip /tmp/db_latest.sql.gz
psql -h localhost -U mentra_user -d mentra_prod < /tmp/db_latest.sql

# 3. Restart services
docker-compose start
sudo systemctl start mentra
```

#### SSL Certificate Expired
```bash
# 1. Renew certificate
sudo certbot renew --force-renewal

# 2. Reload Nginx
sudo nginx -s reload

# 3. Verify SSL
openssl s_client -connect api.mentra.com:443 -servername api.mentra.com
```

---

## 🔍 Diagnostic Tools

### Log Analysis

#### Grep Commands for Common Issues
```bash
# Authentication errors
grep -i "auth" backend/logs/mentra.log | tail -20

# Database errors
grep -i "database\|postgresql\|sql" backend/logs/mentra.log | tail -20

# API errors
grep -E "(error|500|400)" backend/logs/mentra.log | tail -20

# Performance issues
grep -i "slow\|timeout\|memory" backend/logs/mentra.log | tail -20
```

#### Structured Log Analysis
```bash
# If using JSON logging
cat backend/logs/mentra.log | jq '.level == "error"'
cat backend/logs/mentra.log | jq '.message | contains("database")'
```

### System Monitoring

#### Resource Usage Commands
```bash
# Memory usage by process
ps aux --sort=-%mem | grep node

# Disk usage
df -h
du -sh /opt/mentra/*

# Network connections
netstat -tulpn | grep :3001
ss -tulpn | grep :3001

# Database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

---

## 📞 Getting Help

### When to Escalate

1. **Security incidents** - Immediate escalation
2. **Data loss** - Immediate escalation  
3. **Service outages** > 1 hour
4. **Performance degradation** > 50%
5. **Authentication failures** affecting multiple users

### Escalation Contacts

- **Emergency:** alerts@mentra.com
- **Technical:** admin@mentra.com
- **Slack:** #mentra-ops
- **Issue Tracker:** GitHub Issues

### Information to Gather

Before contacting support, collect:

1. **Error messages** (exact text)
2. **Log excerpts** (relevant sections)
3. **System information** (OS, Node.js version, etc.)
4. **Steps to reproduce** (detailed)
5. **Recent changes** (deployments, config changes)
6. **Impact assessment** (users affected, services down)

### Useful Diagnostic Script

```bash
#!/bin/bash
# Create diagnostic report
echo "=== Mentra Diagnostic Report ==="
echo "Generated: $(date)"
echo ""

echo "=== System Information ==="
uname -a
node --version
npm --version
docker --version

echo ""
echo "=== Service Status ==="
docker ps
sudo systemctl status mentra --no-pager
sudo systemctl status postgresql --no-pager
sudo systemctl status nginx --no-pager

echo ""
echo "=== Health Checks ==="
curl -s http://localhost:3001/health | jq . || echo "Backend health check failed"

echo ""
echo "=== Recent Errors ==="
tail -50 backend/logs/mentra.log | grep -i error | tail -10

echo ""
echo "=== Resource Usage ==="
free -h
df -h /
ps aux --sort=-%mem | head -5
```

---

**🔧 Keep this guide handy** for quick issue resolution. Most problems can be solved by following these procedures systematically.

*Last Updated: January 15, 2024* 