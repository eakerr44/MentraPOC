# 🏛️ Mentra Administrator Installation Guide

## Overview

This guide provides comprehensive instructions for administrators deploying the Mentra AI-native learning platform in production environments. It covers server setup, security configuration, deployment procedures, monitoring, and maintenance.

## 📋 Production Requirements

### Infrastructure Requirements

| Component | Minimum | Recommended | Enterprise |
|-----------|---------|-------------|------------|
| **CPU** | 4 cores | 8 cores | 16+ cores |
| **RAM** | 16GB | 32GB | 64GB+ |
| **Storage** | 100GB SSD | 500GB SSD | 1TB+ NVMe |
| **Network** | 100 Mbps | 1 Gbps | 10 Gbps |
| **Load Balancer** | Single instance | Multi-zone | Global |

### Server Requirements

#### Operating System
- **Linux** (Recommended): Ubuntu 20.04 LTS, CentOS 8, RHEL 8+
- **Container Platform**: Docker 20.10+, Kubernetes 1.20+
- **Cloud Platforms**: AWS, Azure, GCP, or compatible infrastructure

#### Software Stack
- **Node.js**: 18.0.0+ (LTS recommended)
- **PostgreSQL**: 15+ with extensions
- **Redis**: 7.0+ for session management
- **ChromaDB**: Latest for vector storage
- **Nginx**: 1.20+ for reverse proxy
- **SSL/TLS**: Valid certificates required

### Security Requirements
- **HTTPS**: Required for all production traffic
- **Firewall**: Configured with minimal open ports
- **SSH**: Key-based authentication only
- **Monitoring**: Real-time security monitoring
- **Backups**: Automated daily backups
- **Compliance**: FERPA/COPPA compliance ready

---

## 🚀 Installation Methods

### Method 1: Docker Deployment (Recommended)

#### Prerequisites
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Production Deployment
```bash
# 1. Clone repository
git clone https://github.com/mentra-ai/proof-of-concept.git
cd mentra-proof-of-concept

# 2. Create production directory
sudo mkdir -p /opt/mentra
sudo chown $USER:$USER /opt/mentra
cp -r . /opt/mentra/
cd /opt/mentra

# 3. Setup production environment
./scripts/setup-env.sh production

# 4. Configure production variables (see configuration section)
sudo nano backend/.env.production

# 5. Deploy with Docker Compose
npm run docker:prod-build
npm run docker:prod

# 6. Run initial setup
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

### Method 2: Kubernetes Deployment

#### Prerequisites
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### Kubernetes Manifests
Create `k8s/` directory with deployment manifests:

**Namespace Configuration:**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mentra
```

**Database Configuration:**
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: mentra
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: mentra_prod
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

Deploy to Kubernetes:
```bash
# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment
kubectl get pods -n mentra
```

### Method 3: Manual Server Installation

#### System Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 15
sudo apt install postgresql-15 postgresql-contrib-15

# Install Redis
sudo apt install redis-server

# Install Nginx
sudo apt install nginx

# Install PM2 for process management
sudo npm install -g pm2
```

#### Application Setup
```bash
# Create application user
sudo useradd -m -s /bin/bash mentra
sudo usermod -aG sudo mentra

# Setup application directory
sudo mkdir -p /opt/mentra
sudo chown mentra:mentra /opt/mentra

# Switch to mentra user
sudo su - mentra
cd /opt/mentra

# Clone and setup application
git clone https://github.com/mentra-ai/proof-of-concept.git .
npm run install:all
npm run build

# Setup environment
./scripts/setup-env.sh production
```

---

## ⚙️ Configuration

### Environment Configuration

#### Production Environment File
Create and secure the production environment file:

```bash
# Create production environment
sudo nano /opt/mentra/backend/.env.production
```

**Complete Production Configuration:**
```bash
# =============================================================================
# MENTRA PRODUCTION ENVIRONMENT CONFIGURATION
# =============================================================================

# SECURITY WARNING: Keep this file secure and never commit to version control
# File Permissions: chmod 600 .env.production

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://app.mentra.com
API_BASE_URL=https://api.mentra.com

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=postgresql://mentra_user:CHANGE_STRONG_PASSWORD@localhost:5432/mentra_prod
POSTGRES_DB=mentra_prod
POSTGRES_USER=mentra_user
POSTGRES_PASSWORD=CHANGE_STRONG_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=20

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
# Generate with: openssl rand -base64 64
JWT_SECRET=CHANGE_PRODUCTION_super_secure_jwt_secret_minimum_64_characters_long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Generate with: openssl rand -base64 32
SESSION_SECRET=CHANGE_PRODUCTION_session_secret_32_characters

# Password hashing
BCRYPT_ROUNDS=14

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Security headers
CSP_REPORT_ONLY=false
HSTS_MAX_AGE=31536000
SECURITY_HEADERS_ENABLED=true

# =============================================================================
# AI CONFIGURATION
# =============================================================================
AI_API_KEY=your_production_ai_api_key
AI_MODEL=gpt-4
AI_ENDPOINT=https://api.openai.com/v1
AI_TIMEOUT=30000
AI_MAX_TOKENS=2000

# =============================================================================
# VECTOR DATABASE (ChromaDB)
# =============================================================================
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION_NAME=mentra_prod_context
CHROMA_AUTH_TOKEN=CHANGE_PRODUCTION_chroma_auth_token

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=CHANGE_PRODUCTION_redis_password
REDIS_DB=0
REDIS_CLUSTER_MODE=false

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
LOG_LEVEL=warn
LOG_FILE=/opt/mentra/logs/mentra.log
LOG_MAX_SIZE=100mb
LOG_MAX_FILES=30
LOG_FORMAT=json

# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
FROM_EMAIL=noreply@mentra.com
ADMIN_EMAIL=admin@mentra.com

# =============================================================================
# MONITORING & ANALYTICS
# =============================================================================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=your_new_relic_license_key
DATADOG_API_KEY=your_datadog_api_key

# =============================================================================
# EXTERNAL SERVICES
# =============================================================================
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET=mentra-prod-assets

# =============================================================================
# COMPLIANCE & PRIVACY
# =============================================================================
DATA_RETENTION_DAYS=2555  # 7 years
COPPA_MODE=true
FERPA_COMPLIANCE=true
ANALYTICS_ENABLED=true
AUDIT_LOGGING=true

# =============================================================================
# BACKUP CONFIGURATION
# =============================================================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=90
BACKUP_S3_BUCKET=mentra-prod-backups
```

#### Secure the Configuration
```bash
# Set proper permissions
sudo chmod 600 /opt/mentra/backend/.env.production
sudo chown mentra:mentra /opt/mentra/backend/.env.production

# Validate configuration
cd /opt/mentra && npm run env:validate
```

### Database Setup

#### PostgreSQL Configuration
```bash
# Configure PostgreSQL
sudo -u postgres psql

-- Create production database and user
CREATE DATABASE mentra_prod;
CREATE USER mentra_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE mentra_prod TO mentra_user;

-- Enable required extensions
\c mentra_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Exit psql
\q
```

#### Database Security
```bash
# Configure PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf

# Key settings:
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Configure authentication
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add SSL requirement:
hostssl mentra_prod mentra_user 127.0.0.1/32 md5
hostssl mentra_prod mentra_user ::1/128 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Nginx Configuration

#### SSL Setup with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.mentra.com -d app.mentra.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/mentra.com
upstream backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.mentra.com app.mentra.com;
    return 301 https://$server_name$request_uri;
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.mentra.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.mentra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.mentra.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # API Proxy
    location / {
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

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://backend;
    }
}

# Frontend Application
server {
    listen 443 ssl http2;
    server_name app.mentra.com;

    # SSL Configuration (same as API)
    ssl_certificate /etc/letsencrypt/live/app.mentra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.mentra.com/privkey.pem;
    
    # Frontend Static Files
    root /opt/mentra/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass https://api.mentra.com;
    }

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the configuration:
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mentra.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Security Configuration

### Firewall Setup
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### SSH Hardening
```bash
# Configure SSH
sudo nano /etc/ssh/sshd_config

# Key settings:
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart ssh
```

### System Security
```bash
# Install fail2ban
sudo apt install fail2ban

# Configure fail2ban
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Application Security
```bash
# Set up log rotation
sudo nano /etc/logrotate.d/mentra

/opt/mentra/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 mentra mentra
    postrotate
        systemctl reload mentra
    endscript
}

# Create systemd service
sudo nano /etc/systemd/system/mentra.service

[Unit]
Description=Mentra Learning Platform
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=mentra
WorkingDirectory=/opt/mentra
Environment=NODE_ENV=production
ExecStart=/usr/bin/node backend/src/app.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mentra

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl enable mentra
sudo systemctl start mentra
```

---

## 📊 Monitoring & Maintenance

### Health Monitoring
```bash
# Create monitoring script
sudo nano /opt/mentra/scripts/health-check.sh

#!/bin/bash
HEALTH_URL="https://api.mentra.com/health"
SLACK_WEBHOOK="your-slack-webhook-url"

check_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
    if [ $response -eq 200 ]; then
        echo "✅ Mentra is healthy"
        return 0
    else
        echo "❌ Mentra health check failed (HTTP $response)"
        # Send alert to Slack
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚨 Mentra health check failed"}' \
            $SLACK_WEBHOOK
        return 1
    fi
}

check_health

# Make executable
sudo chmod +x /opt/mentra/scripts/health-check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /opt/mentra/scripts/health-check.sh
```

### Backup Strategy
```bash
# Create backup script
sudo nano /opt/mentra/scripts/backup.sh

#!/bin/bash
BACKUP_DIR="/opt/mentra/backups"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="mentra-prod-backups"

# Database backup
pg_dump -h localhost -U mentra_user mentra_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Application backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/mentra --exclude=/opt/mentra/backups

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://$S3_BUCKET/
aws s3 cp $BACKUP_DIR/app_$DATE.tar.gz s3://$S3_BUCKET/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /opt/mentra/scripts/backup.sh
```

### Performance Monitoring
```bash
# Install htop for system monitoring
sudo apt install htop

# Install log analysis tools
sudo apt install goaccess

# Nginx log analysis
sudo goaccess /var/log/nginx/access.log -o /var/www/html/report.html --log-format=COMBINED --real-time-html

# Database performance monitoring
sudo -u postgres psql -d mentra_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"
```

---

## 🚀 Deployment Procedures

### Production Deployment Checklist

#### Pre-Deployment
- [ ] Code reviewed and tested
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup completed
- [ ] Monitoring configured
- [ ] Team notified

#### Deployment Steps
```bash
# 1. Enter maintenance mode
sudo systemctl stop mentra

# 2. Backup current version
cp -r /opt/mentra /opt/mentra-backup-$(date +%Y%m%d)

# 3. Pull latest code
cd /opt/mentra
git pull origin main

# 4. Install dependencies
npm run install:all

# 5. Run database migrations
npm run migrate

# 6. Build application
npm run build

# 7. Start service
sudo systemctl start mentra

# 8. Verify deployment
npm run health:check

# 9. Test critical paths
curl -f https://api.mentra.com/health
curl -f https://app.mentra.com/
```

#### Post-Deployment
- [ ] Health checks passing
- [ ] Logs reviewed
- [ ] Performance metrics normal
- [ ] User acceptance testing
- [ ] Team notified of completion

### Rollback Procedure
```bash
# Emergency rollback
sudo systemctl stop mentra
rm -rf /opt/mentra
mv /opt/mentra-backup-YYYYMMDD /opt/mentra
sudo systemctl start mentra

# Verify rollback
npm run health:check
```

---

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
sudo systemctl status mentra

# Check logs
sudo journalctl -u mentra -f

# Check application logs
tail -f /opt/mentra/logs/mentra.log

# Check environment
sudo -u mentra env | grep NODE_ENV
```

#### Database Connection Issues
```bash
# Test database connection
sudo -u mentra psql -h localhost -U mentra_user -d mentra_prod

# Check PostgreSQL status
sudo systemctl status postgresql

# Review PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js memory
node --max-old-space-size=4096 backend/src/app.js

# Monitor with top
htop
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/api.mentra.com/cert.pem -text -noout | grep "Not After"

# Renew certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect api.mentra.com:443
```

---

## 📞 Support & Escalation

### Emergency Contacts
- **Primary On-Call:** alerts@mentra.com
- **Secondary On-Call:** admin@mentra.com
- **Slack Channel:** #mentra-ops

### Escalation Procedures
1. **Level 1:** Basic troubleshooting (5 minutes)
2. **Level 2:** Service restart and logs review (15 minutes)
3. **Level 3:** Emergency rollback (30 minutes)
4. **Level 4:** Full system restore (60 minutes)

### Support Resources
- **Documentation:** https://docs.mentra.com
- **Status Page:** https://status.mentra.com
- **Issue Tracker:** GitHub Issues
- **Emergency Playbook:** Internal documentation

---

**🏛️ Production deployment complete!** Your Mentra platform is now running securely in production.

*Last Updated: January 15, 2024* 