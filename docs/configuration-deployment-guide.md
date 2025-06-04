# 🚀 Mentra Configuration & Deployment Guide

This comprehensive guide covers configuration and deployment procedures for all Mentra environments: development, staging, and production.

## 📋 Table of Contents

1. [Overview & Prerequisites](#overview--prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Development Deployment](#development-deployment)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Security Configuration](#security-configuration)
7. [Database Management](#database-management)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Emergency Procedures](#emergency-procedures)

---

## 🎯 Overview & Prerequisites

### System Requirements

#### Development Environment
- **OS**: macOS, Linux, or Windows with WSL2
- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+
- **Docker**: v20+ (for database services)
- **Git**: v2.30+
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB free space

#### Staging Environment
- **OS**: Ubuntu 20.04 LTS or CentOS 8+
- **Node.js**: v18+ (LTS)
- **npm**: v9+
- **Docker**: v20+ and Docker Compose v2+
- **RAM**: 16GB minimum
- **Storage**: 100GB free space
- **Network**: Stable internet connection

#### Production Environment
- **OS**: Ubuntu 20.04 LTS (recommended)
- **Node.js**: v18+ (LTS)
- **Docker**: v20+ and Docker Compose v2+
- **PostgreSQL**: v15+ (if self-hosted)
- **Nginx**: v1.20+ (for reverse proxy)
- **SSL Certificate**: Valid TLS certificate
- **RAM**: 32GB minimum, 64GB recommended
- **Storage**: 500GB+ SSD storage
- **Network**: High-bandwidth, low-latency connection
- **Monitoring**: Application performance monitoring (APM) service

### Required External Services

#### Development
- **AI Service**: Local or development API key
- **Email**: Development SMTP (optional)

#### Staging/Production
- **AI Service**: Production API keys (OpenAI, Llama, etc.)
- **Email Service**: SendGrid, AWS SES, or similar
- **Monitoring**: Sentry, New Relic, or Datadog
- **CDN**: CloudFlare or AWS CloudFront (production)
- **Backup Storage**: AWS S3, Google Cloud Storage, or Azure Blob

---

## ⚙️ Environment Configuration

### Quick Setup Script

Use our automated setup script to generate environment configurations:

```bash
# Setup development environment
./scripts/setup-env.sh development

# Setup staging environment
./scripts/setup-env.sh staging

# Setup production environment
./scripts/setup-env.sh production

# Setup all environments
./scripts/setup-env.sh all
```

**Note**: These scripts include automated rollback procedures and health check endpoints for reliable deployments.

### Manual Configuration

#### 1. Development Environment

**Create `.env` file:**
```bash
cd backend
cp env.example .env
```

**Essential Configuration:**
```env
NODE_ENV=development
DATABASE_URL=postgresql://mentra_user:secure_password@localhost:5432/mentra_dev
JWT_SECRET=generated_64_char_secret_key_here
AI_API_KEY=your_development_ai_api_key
CHROMA_HOST=localhost
CHROMA_PORT=8000
REDIS_URL=redis://localhost:6379
```

#### 2. Staging Environment

**Create `.env.staging` file:**
```bash
cd backend
cp env.staging.template .env.staging
```

**Key Configuration Areas:**
- Database connections (external hosted recommended)
- AI service API keys (staging tier)
- Email service configuration
- External URLs and endpoints
- Monitoring service keys (optional)

#### 3. Production Environment

**Security Note**: Production configuration requires manual setup for security reasons.

**Create `.env.production` file:**
```bash
cd backend
cp env.production.template .env.production
```

**Critical Configuration:**
- **Strong passwords**: Use 32+ character random passwords
- **JWT secrets**: 64+ character random keys
- **External services**: Production-tier API keys
- **SSL certificates**: Valid TLS certificates
- **Monitoring**: Full observability stack
- **Backups**: Automated backup configuration

### Environment Variables Reference

#### Core Application Settings

| Variable | Development | Staging | Production | Description |
|----------|-------------|---------|------------|-------------|
| `NODE_ENV` | development | staging | production | Runtime environment |
| `PORT` | 3001 | 3001 | 3001 | Application port |
| `LOG_LEVEL` | debug | info | warn | Logging verbosity |
| `FRONTEND_URL` | http://localhost:5173 | https://staging.mentra.com | https://mentra.com | Frontend URL |

#### Database Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `POSTGRES_DB` | ✅ | Database name |
| `POSTGRES_USER` | ✅ | Database username |
| `POSTGRES_PASSWORD` | ✅ | Database password |

#### Authentication & Security

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | JWT signing secret (64+ chars) |
| `JWT_EXPIRES_IN` | ✅ | JWT expiration time |
| `BCRYPT_ROUNDS` | ✅ | Password hashing rounds |
| `SESSION_SECRET` | ✅ | Session signing secret |

#### AI Services

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_API_KEY` | ✅ | AI service API key |
| `AI_MODEL` | ✅ | AI model identifier |
| `AI_ENDPOINT` | ✅ | AI service endpoint URL |

#### Vector Database (ChromaDB)

| Variable | Required | Description |
|----------|----------|-------------|
| `CHROMA_HOST` | ✅ | ChromaDB host |
| `CHROMA_PORT` | ✅ | ChromaDB port |
| `CHROMA_AUTH_TOKEN` | 🟡 | Authentication token |
| `CHROMA_COLLECTION_NAME` | ✅ | Collection name |

#### Redis Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | ✅ | Redis connection string |
| `REDIS_PASSWORD` | 🟡 | Redis password |

#### Email Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | 🟡 | SMTP server host |
| `SMTP_PORT` | 🟡 | SMTP server port |
| `SMTP_USER` | 🟡 | SMTP username |
| `SMTP_PASS` | 🟡 | SMTP password |
| `FROM_EMAIL` | 🟡 | Default sender email |

#### Monitoring & Observability

| Variable | Environment | Description |
|----------|-------------|-------------|
| `SENTRY_DSN` | Staging/Prod | Error tracking |
| `NEW_RELIC_LICENSE_KEY` | Production | Performance monitoring |
| `DATADOG_API_KEY` | Production | Infrastructure monitoring |

---

## 🔧 Development Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/mentra.git
cd mentra

# Install dependencies
npm run install:all

# Setup environment
./scripts/setup-env.sh development

# Start services
docker-compose up -d

# Run migrations
cd backend && npm run migrate

# Start development servers
npm run dev
```

### Detailed Setup

#### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

#### 2. Start Database Services

```bash
# Start PostgreSQL, ChromaDB, and Redis
docker-compose up -d

# Verify services are running
docker-compose ps

# Check service health
docker-compose logs postgres
docker-compose logs chroma
docker-compose logs redis
```

#### 3. Configure Environment

```bash
# Generate development environment file
./scripts/setup-env.sh development

# Validate configuration
cd backend && npm run env:validate
```

#### 4. Initialize Database

```bash
# Run database migrations
cd backend
npm run migrate

# Seed development data (optional)
npm run seed:dev
```

#### 5. Start Application

```bash
# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

#### 6. Verify Installation

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **Database**: PostgreSQL on localhost:5432
- **ChromaDB**: http://localhost:8000
- **Redis**: localhost:6379

### Development Environment Management

#### Resetting Development Environment

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Restart clean environment
docker-compose up -d
cd backend && npm run migrate && npm run seed:dev
```

#### Updating Dependencies

```bash
# Update all dependencies
npm run update:all

# Rebuild Docker images if needed
docker-compose build --no-cache
```

---

## 🏗️ Staging Deployment

### Infrastructure Requirements

- **Server**: Ubuntu 20.04 LTS, 16GB RAM, 100GB storage
- **Domain**: staging.mentra.com (or similar)
- **SSL**: Let's Encrypt or purchased certificate
- **Database**: Hosted PostgreSQL (recommended)
- **Monitoring**: Basic observability setup

### Deployment Process

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/your-org/mentra.git /opt/mentra
cd /opt/mentra

# Setup staging environment
./scripts/setup-env.sh staging

# Configure staging environment variables
sudo nano backend/.env.staging
```

#### 3. Configure Database

**Option A: Hosted Database (Recommended)**
```bash
# Update .env.staging with hosted database URL
DATABASE_URL=postgresql://user:password@your-db-host:5432/mentra_staging
```

**Option B: Local Database**
```bash
# Use Docker Compose for database services
docker-compose -f docker-compose.yml up -d postgres chroma redis
```

#### 4. SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d staging.mentra.com

# Verify certificate
sudo certbot certificates
```

#### 5. Deploy Application

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Verify deployment
curl https://staging.mentra.com/health
```

#### 6. Configure Nginx

Create `/etc/nginx/sites-available/mentra-staging`:

```nginx
server {
    listen 80;
    server_name staging.mentra.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.mentra.com;

    ssl_certificate /etc/letsencrypt/live/staging.mentra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.mentra.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mentra-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Staging Environment Management

#### Process Management with PM2

```bash
# Install PM2
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'mentra-staging',
    script: './backend/src/app.js',
    env: {
      NODE_ENV: 'staging'
    },
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Monitoring and Logs

```bash
# View application logs
pm2 logs

# Monitor processes
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🌐 Production Deployment

### Infrastructure Requirements

#### Minimum Production Infrastructure
- **Application Server**: Ubuntu 20.04 LTS, 32GB RAM, 500GB SSD
- **Database**: Hosted PostgreSQL (AWS RDS, Google Cloud SQL)
- **Load Balancer**: Nginx or cloud load balancer
- **CDN**: CloudFlare, AWS CloudFront, or similar
- **SSL Certificate**: Valid TLS certificate
- **Monitoring**: Full observability stack
- **Backup**: Automated backup solution

#### Recommended Production Architecture

```
[Internet] → [CDN] → [Load Balancer] → [App Servers] → [Database]
                                    ↓
                              [Monitoring & Logging]
```

### Pre-Deployment Checklist

- [ ] **Infrastructure**: Servers provisioned and configured
- [ ] **DNS**: Domain configured and propagated
- [ ] **SSL**: Valid certificates installed
- [ ] **Database**: Production database ready
- [ ] **Monitoring**: APM and logging configured
- [ ] **Backups**: Backup strategy implemented
- [ ] **Security**: Security review completed
- [ ] **Environment**: Production environment file configured
- [ ] **Tests**: All tests passing
- [ ] **Dependencies**: All production dependencies available

### Deployment Process

#### 1. Infrastructure Setup

**Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Install required packages
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx fail2ban

# Install Node.js (production LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Application Deployment

```bash
# Clone repository
sudo mkdir -p /opt/mentra
sudo chown $USER:$USER /opt/mentra
git clone https://github.com/your-org/mentra.git /opt/mentra
cd /opt/mentra

# Setup production environment (manual configuration required)
./scripts/setup-env.sh production

# Configure production environment
sudo nano backend/.env.production
```

**Critical Production Environment Configuration:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:strong_password@prod-db-host:5432/mentra_production
JWT_SECRET=extremely_long_and_random_64_plus_character_secret_key
FRONTEND_URL=https://mentra.com
BACKEND_URL=https://api.mentra.com

# Security settings
BCRYPT_ROUNDS=14
RATE_LIMIT_MAX_REQUESTS=50
LOG_LEVEL=warn

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
NEW_RELIC_LICENSE_KEY=your_newrelic_key
```

#### 3. Database Setup

**Option A: Hosted Database (Recommended)**
```bash
# Configure connection to hosted PostgreSQL
# Run migrations on production database
cd backend
NODE_ENV=production npm run migrate
```

**Option B: Self-Hosted Database**
```bash
# Use production Docker Compose
docker-compose -f docker-compose.prod.yml up -d postgres
```

#### 4. SSL Certificate Configuration

```bash
# Obtain production SSL certificate
sudo certbot --nginx -d mentra.com -d api.mentra.com

# Verify certificate installation
sudo certbot certificates

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 5. Production Deployment

```bash
# Deploy to production with confirmation
./scripts/deploy.sh production

# Verify deployment
curl https://api.mentra.com/health
```

#### 6. Nginx Production Configuration

Create `/etc/nginx/sites-available/mentra-production`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Upstream servers
upstream backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name mentra.com api.mentra.com;
    return 301 https://$server_name$request_uri;
}

# Main application
server {
    listen 443 ssl http2;
    server_name mentra.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/mentra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mentra.com/privkey.pem;
    
    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Frontend static files
    location / {
        root /opt/mentra/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API subdomain
server {
    listen 443 ssl http2;
    server_name api.mentra.com;

    ssl_certificate /etc/letsencrypt/live/mentra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mentra.com/privkey.pem;

    location / {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable configuration:
```bash
sudo ln -s /etc/nginx/sites-available/mentra-production /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Production Process Management

#### Docker Production Deployment

```bash
# Deploy with Docker Compose
cd /opt/mentra
docker-compose -f docker-compose.prod.yml up -d

# Verify all services are running
docker-compose -f docker-compose.prod.yml ps

# Check service logs
docker-compose -f docker-compose.prod.yml logs backend
```

**Note**: All Docker services include built-in health checks for monitoring service status and automated recovery.

#### Process Monitoring

```bash
# Monitor Docker containers
docker stats

# Check container health
docker-compose -f docker-compose.prod.yml ps
```

---

## 🔒 Security Configuration

### Development Security

#### Basic Security Measures
- Use generated secrets for JWT and sessions
- Enable CORS protection
- Use HTTPS for external API calls
- Keep dependencies updated

#### Development-Specific Settings
```env
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=1000
BCRYPT_ROUNDS=10
FEATURE_DEBUG_MODE=true
```

### Staging Security

#### Enhanced Security Measures
- Use strong, unique passwords
- Enable rate limiting
- Configure basic monitoring
- Regular security updates

#### Staging-Specific Settings
```env
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
FEATURE_DEBUG_MODE=false
FEATURE_TEST_ENDPOINTS=true
```

### Production Security

#### Critical Security Measures

**1. Strong Authentication**
```env
JWT_SECRET=64_plus_character_random_secret
BCRYPT_ROUNDS=14
SESSION_SECRET=32_plus_character_random_secret
```

**2. Rate Limiting**
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=50   # Per window
USER_RATE_LIMIT_MAX=1000     # Per hour per user
```

**3. Security Headers**
```env
HSTS_MAX_AGE=31536000
CSP_POLICY="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
```

**4. Data Protection**
```env
DATA_RETENTION_DAYS=365
COPPA_MODE=true
ANALYTICS_ENABLED=true
```

**5. Secure Communication**
- Force HTTPS everywhere
- Use TLS 1.2+ only
- Implement certificate pinning
- Regular certificate rotation

#### Security Checklist

- [ ] **Secrets Management**: All secrets are strong and unique
- [ ] **Database Security**: Encrypted connections, restricted access
- [ ] **API Security**: Rate limiting, input validation, output sanitization
- [ ] **Infrastructure Security**: Firewall configured, unnecessary services disabled
- [ ] **Monitoring**: Security event logging and alerting
- [ ] **Updates**: Regular security updates applied
- [ ] **Backup Security**: Encrypted backups, secure storage
- [ ] **Access Control**: Principle of least privilege
- [ ] **Network Security**: VPN or private networks for internal communication
- [ ] **Compliance**: COPPA, GDPR, and other relevant regulations

### Security Monitoring

#### Log Monitoring
```bash
# Setup centralized logging
# Configure log aggregation (ELK stack, Splunk, etc.)
# Monitor for security events
# Setup alerting for suspicious activities
```

#### Security Scanning
```bash
# Regular vulnerability scans
npm audit
docker scan

# Dependency vulnerability checking
npm audit --audit-level high
```

---

## 🗄️ Database Management

### Database Configuration

#### Development Database
```bash
# Start local PostgreSQL
docker-compose up -d postgres

# Connect to database
psql postgresql://mentra_user:password@localhost:5432/mentra_dev
```

#### Staging/Production Database
```bash
# Use hosted database service (recommended)
# AWS RDS, Google Cloud SQL, Azure Database

# Connection example
DATABASE_URL=postgresql://user:password@your-db-host:5432/mentra_prod
```

### Migration Management

#### Running Migrations

```bash
# Development
cd backend
npm run migrate

# Staging
NODE_ENV=staging npm run migrate

# Production
NODE_ENV=production npm run migrate
```

#### Migration Best Practices

1. **Always backup before migrations**
2. **Test migrations in staging first**
3. **Use transactions for complex migrations**
4. **Plan rollback procedures**
5. **Monitor performance during migrations**

#### Rollback Procedures

```bash
# Create rollback migration
npm run migrate:create rollback_migration_name

# Rollback last migration
npm run migrate:rollback

# Rollback to specific migration
npm run migrate:rollback --to=20231201120000
```

### Database Backups

#### Automated Backup Script

Create `/opt/mentra/scripts/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/mentra/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="your_database_url_here"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/mentra_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/mentra_backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: mentra_backup_$DATE.sql.gz"
```

#### Automated Backup Schedule

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/mentra/scripts/backup-db.sh
```

#### Backup Verification

```bash
# Test backup restoration
pg_restore --dbname=test_restore backup_file.sql.gz

# Verify data integrity
psql test_restore -c "SELECT COUNT(*) FROM users;"
```

### Database Monitoring

#### Performance Monitoring

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('mentra_production'));

-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### Health Checks

```bash
# Database connectivity check
pg_isready -h your-db-host -p 5432 -U mentra_user

# Check database locks
psql -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

---

## 📊 Monitoring & Maintenance

### Application Monitoring

#### Health Checks

**Development Health Check:**
```bash
curl http://localhost:3001/health
```

**Production Health Check:**
```bash
curl https://api.mentra.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "chroma": "healthy"
  },
  "version": "1.0.0"
}
```

#### Application Performance Monitoring (APM)

**Sentry Integration:**
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**New Relic Integration:**
```env
NEW_RELIC_LICENSE_KEY=your_license_key
NEW_RELIC_APP_NAME=Mentra-Production
```

**Datadog Integration:**
```env
DATADOG_API_KEY=your_api_key
DATADOG_APP_KEY=your_app_key
```

### Infrastructure Monitoring

#### System Metrics

```bash
# CPU and Memory usage
htop

# Disk usage
df -h

# Network connections
netstat -tulpn

# Docker container stats
docker stats
```

#### Log Management

**Centralized Logging Setup:**
```bash
# Install filebeat for log shipping
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.5.0-amd64.deb
sudo dpkg -i filebeat-8.5.0-amd64.deb

# Configure filebeat
sudo nano /etc/filebeat/filebeat.yml
```

**Log Rotation:**
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/mentra

/opt/mentra/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 mentra mentra
    postrotate
        /usr/bin/systemctl reload nginx
    endscript
}
```

### Maintenance Procedures

#### Regular Maintenance Tasks

**Daily:**
- Check application health
- Monitor error rates
- Review security logs
- Verify backup completion

**Weekly:**
- Update dependencies
- Review performance metrics
- Check disk space
- Analyze user feedback

**Monthly:**
- Security updates
- Database optimization
- Log cleanup
- Performance review

#### Automated Maintenance Script

Create `/opt/mentra/scripts/maintenance.sh`:

```bash
#!/bin/bash

echo "Starting maintenance tasks..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker images
docker system prune -f

# Cleanup old logs
find /opt/mentra/logs -name "*.log" -mtime +7 -delete

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart

echo "Maintenance completed"
```

#### Scheduled Maintenance

```bash
# Add to crontab
0 3 * * 0 /opt/mentra/scripts/maintenance.sh  # Weekly on Sunday at 3 AM
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Application Won't Start

**Symptoms:**
- Application fails to start
- Connection refused errors
- 500 Internal Server Error

**Diagnosis:**
```bash
# Check application logs
docker-compose logs backend

# Check process status
ps aux | grep node

# Check port availability
netstat -tulpn | grep 3001
```

**Solutions:**
1. **Environment Variables:** Verify all required environment variables are set
2. **Database Connection:** Ensure database is accessible
3. **Port Conflicts:** Check if port 3001 is already in use
4. **Dependencies:** Run `npm install` to ensure all dependencies are installed

#### Database Connection Issues

**Symptoms:**
- Database connection errors
- Query timeouts
- Authentication failures

**Diagnosis:**
```bash
# Test database connectivity
pg_isready -h your-db-host -p 5432 -U mentra_user

# Check database logs
docker-compose logs postgres

# Verify credentials
psql $DATABASE_URL
```

**Solutions:**
1. **Network:** Verify network connectivity to database host
2. **Credentials:** Check username/password in environment variables
3. **Firewall:** Ensure database port is accessible
4. **SSL:** Configure SSL settings if required

#### Performance Issues

**Symptoms:**
- Slow response times
- High CPU/memory usage
- Timeouts

**Diagnosis:**
```bash
# Check system resources
htop
iostat -x 1

# Check database performance
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check application metrics
curl https://api.mentra.com/metrics
```

**Solutions:**
1. **Database Optimization:** Add indexes, optimize queries
2. **Caching:** Implement Redis caching
3. **Scaling:** Add more application instances
4. **CDN:** Use content delivery network for static assets

#### SSL Certificate Issues

**Symptoms:**
- Certificate warnings
- HTTPS not working
- Certificate expired errors

**Diagnosis:**
```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect mentra.com:443

# Check certificate expiry
echo | openssl s_client -servername mentra.com -connect mentra.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Solutions:**
1. **Renewal:** Renew expired certificates with certbot
2. **Configuration:** Verify Nginx SSL configuration
3. **DNS:** Ensure DNS points to correct server
4. **Firewall:** Open ports 80 and 443

### Debugging Tools

#### Application Debugging

```bash
# Enable debug logging
export LOG_LEVEL=debug
export DEBUG=mentra:*

# Run with debugger
node --inspect src/app.js

# Memory profiling
node --prof src/app.js
```

#### Network Debugging

```bash
# Test API endpoints
curl -v https://api.mentra.com/health

# Check DNS resolution
nslookup mentra.com

# Test port connectivity
telnet api.mentra.com 443
```

#### Performance Profiling

```bash
# Profile database queries
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

# Monitor system performance
sar -u -r -d 1

# Application profiling
npm run profile
```

---

## 🚨 Emergency Procedures

### Incident Response

#### Severity Levels

**P0 - Critical (Production Down)**
- Complete service outage
- Data corruption or loss
- Security breach

**P1 - High (Significant Impact)**
- Partial service outage
- Performance degradation
- Authentication issues

**P2 - Medium (Minor Impact)**
- Non-critical feature issues
- Warning alerts
- Minor performance issues

**P3 - Low (Minimal Impact)**
- Cosmetic issues
- Documentation updates
- Non-urgent maintenance

#### Emergency Response Steps

**1. Immediate Assessment (5 minutes)**
- Identify the scope and impact
- Check monitoring dashboards
- Verify user reports

**2. Communication (10 minutes)**
- Notify incident response team
- Update status page
- Inform stakeholders

**3. Mitigation (30 minutes)**
- Implement immediate fixes
- Rollback if necessary
- Apply workarounds

**4. Resolution (As needed)**
- Deploy permanent fix
- Verify resolution
- Monitor for recurring issues

**5. Post-Incident (24 hours)**
- Conduct post-mortem
- Document lessons learned
- Implement prevention measures

### Rollback Procedures

#### Application Rollback

```bash
# Rollback to previous Docker image
docker-compose -f docker-compose.prod.yml down
docker tag mentra-backend:previous mentra-backend:latest
docker-compose -f docker-compose.prod.yml up -d

# Rollback using Git
git checkout previous-stable-tag
./scripts/deploy.sh production --skip-tests
```

#### Database Rollback

```bash
# Restore from backup
pg_restore --dbname=mentra_production backup_file.sql.gz

# Run rollback migrations
npm run migrate:rollback
```

### Health Checks

#### Container Health Checks

```bash
# Check container health
docker-compose -f docker-compose.prod.yml ps
```

### Disaster Recovery

#### Backup Restoration

**Full System Restore:**
```bash
# Restore application code
git clone https://github.com/your-org/mentra.git /opt/mentra-restore

# Restore database
pg_restore --dbname=mentra_production latest_backup.sql.gz

# Restore configuration
cp backup/.env.production /opt/mentra-restore/backend/

# Deploy restored system
cd /opt/mentra-restore
./scripts/deploy.sh production
```

#### Business Continuity

**Communication Plan:**
- Status page updates
- Customer notifications
- Stakeholder communications
- Media response (if needed)

**Recovery Time Objectives:**
- P0 incidents: 1 hour RTO
- P1 incidents: 4 hour RTO
- P2 incidents: 24 hour RTO
- P3 incidents: 72 hour RTO

### Escalation Procedures

#### Internal Escalation

1. **Development Team** (0-15 minutes)
2. **Engineering Manager** (15-30 minutes)
3. **CTO** (30-60 minutes)
4. **Executive Team** (1+ hours)

#### External Escalation

1. **Cloud Provider Support** (Infrastructure issues)
2. **Third-party Service Providers** (External dependencies)
3. **Security Incident Response Team** (Security breaches)
4. **Legal/Compliance** (Data breaches/regulatory issues)

---

## 📋 Deployment Checklists

### Pre-Deployment Checklist

#### Development
- [ ] All tests passing
- [ ] Code review completed
- [ ] Dependencies updated
- [ ] Environment variables configured
- [ ] Database migrations tested

#### Staging
- [ ] All development checks complete
- [ ] Integration tests passing
- [ ] Performance tests completed
- [ ] Security scan completed
- [ ] Backup verification completed

#### Production
- [ ] All staging checks complete
- [ ] Change management approval
- [ ] Rollback plan prepared
- [ ] Monitoring configured
- [ ] Incident response team notified
- [ ] Business stakeholders informed

### Post-Deployment Checklist

#### Immediate Verification (0-15 minutes)
- [ ] Health check endpoints responding
- [ ] Critical user flows working
- [ ] Error rates within normal range
- [ ] Performance metrics stable

#### Extended Verification (15-60 minutes)
- [ ] All application features tested
- [ ] Database performance stable
- [ ] External integrations working
- [ ] Monitoring alerts configured

#### 24-Hour Follow-up
- [ ] Error rates analyzed
- [ ] Performance trends reviewed
- [ ] User feedback collected
- [ ] Documentation updated

---

**🔗 Related Documentation:**
- [API Documentation](api-documentation.md)
- [Authentication Guide](authentication-guide.md)
- [Troubleshooting Guide](troubleshooting-guide.md)
- [Administrator Installation Guide](administrator-installation-guide.md)

---

*Last Updated: January 15, 2024* 