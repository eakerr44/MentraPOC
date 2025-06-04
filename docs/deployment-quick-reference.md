# 🚀 Deployment Quick Reference

## Quick Commands & Checklists

### 📦 Environment Setup
```bash
# Quick development setup
git clone <repo> && cd mentra
npm run install:all
./scripts/setup-env.sh development
docker-compose up -d
cd backend && npm run migrate
npm run dev

# Environment validation
cd backend && npm run env:validate
```

### 🔧 Deployment Commands
```bash
# Development
./scripts/deploy.sh development

# Staging with options
./scripts/deploy.sh staging --skip-tests

# Production (with confirmation)
./scripts/deploy.sh production

# Dry run (no actual deployment)
./scripts/deploy.sh production --dry-run
```

---

## 🌐 Environment URLs & Endpoints

| Environment | Frontend | Backend API | Health Check |
|-------------|----------|-------------|--------------|
| **Development** | http://localhost:5173 | http://localhost:3001 | http://localhost:3001/health |
| **Staging** | https://staging.mentra.com | https://staging-api.mentra.com | https://staging-api.mentra.com/health |
| **Production** | https://mentra.com | https://api.mentra.com | https://api.mentra.com/health |

---

## ⚙️ Essential Environment Variables

### Development (.env)
```env
NODE_ENV=development
DATABASE_URL=postgresql://mentra_user:password@localhost:5432/mentra_dev
JWT_SECRET=64_char_generated_secret_here
AI_API_KEY=your_development_ai_key
CHROMA_HOST=localhost
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### Production (.env.production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:strong_password@prod-host:5432/mentra_prod
JWT_SECRET=extremely_long_random_production_secret_64_plus_chars
BCRYPT_ROUNDS=14
RATE_LIMIT_MAX_REQUESTS=50
LOG_LEVEL=warn
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

---

## 🗄️ Database Commands

### Migrations
```bash
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:create migration_name

# Environment-specific migrations
NODE_ENV=staging npm run migrate
NODE_ENV=production npm run migrate
```

### Backups
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
pg_restore --dbname=mentra_prod backup_file.sql

# Automated backup script
/opt/mentra/scripts/backup-db.sh
```

---

## 🐳 Docker Commands

### Development
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs postgres

# Restart services
docker-compose restart

# Clean reset
docker-compose down -v && docker-compose up -d
```

### Production
```bash
# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d

# View service status
docker-compose -f docker-compose.prod.yml ps

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs backend
```

---

## 🔍 Health Checks & Monitoring

### Service Health
```bash
# Application health
curl https://api.mentra.com/health

# Database connectivity
pg_isready -h localhost -p 5432 -U mentra_user

# Redis connectivity
redis-cli ping

# ChromaDB health
curl http://localhost:8000/api/v1/heartbeat
```

### System Monitoring
```bash
# System resources
htop
df -h
docker stats

# Process monitoring
pm2 status
pm2 logs
pm2 monit

# Network connections
netstat -tulpn | grep :3001
```

---

## 🔧 Common Troubleshooting

### Application Issues
| Problem | Quick Check | Solution |
|---------|-------------|----------|
| **App won't start** | `docker-compose logs backend` | Check env vars, restart services |
| **Database connection** | `pg_isready -h host -p 5432` | Verify credentials, network access |
| **High CPU usage** | `htop`, `docker stats` | Scale instances, optimize queries |
| **Memory issues** | `free -h`, `docker stats` | Restart services, check memory leaks |

### Quick Fixes
```bash
# Restart application
docker-compose restart backend

# Clear Redis cache
redis-cli FLUSHALL

# Restart all services
docker-compose restart

# Force rebuild and restart
docker-compose down && docker-compose up -d --build
```

---

## 🚨 Emergency Procedures

### Immediate Response (P0 Incident)
1. **Check status** (2 min): `curl https://api.mentra.com/health`
2. **View logs** (3 min): `docker-compose logs backend | tail -100`
3. **Rollback** (5 min): `git checkout previous-tag && ./scripts/deploy.sh production`
4. **Notify team**: Update status page and notify stakeholders

### Rollback Commands
```bash
# Quick application rollback
docker-compose down
docker tag mentra-backend:previous mentra-backend:latest
docker-compose up -d

# Database rollback
pg_restore --dbname=mentra_prod latest_backup.sql.gz
npm run migrate:rollback
```

---

## 📋 Deployment Checklists

### Pre-Deployment ✅
- [ ] All tests passing: `npm test`
- [ ] Environment configured: `npm run env:validate`
- [ ] Database backed up: Check latest backup timestamp
- [ ] Monitoring ready: Verify dashboards accessible
- [ ] Team notified: Slack/email sent

### Post-Deployment ✅
- [ ] Health check: `curl https://api.mentra.com/health`
- [ ] Error rates: Check monitoring dashboards
- [ ] User flows: Test critical application paths
- [ ] Performance: Verify response times < 2s
- [ ] Documentation: Update deployment log

---

## 🔐 Security Quick Checks

### Environment Security
```bash
# Check file permissions
ls -la backend/.env*

# Verify secret strength
echo $JWT_SECRET | wc -c  # Should be 64+ chars

# SSL certificate status
sudo certbot certificates

# Security headers test
curl -I https://mentra.com
```

### Security Checklist
- [ ] **Secrets**: Strong, unique passwords generated
- [ ] **SSL**: Valid certificates installed
- [ ] **Firewall**: Only necessary ports open
- [ ] **Updates**: Latest security patches applied
- [ ] **Monitoring**: Security events tracked

---

## 📊 Performance Optimization

### Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('mentra_production'));

-- Active connections
SELECT count(*) FROM pg_stat_activity;
```

### Application Performance
```bash
# Node.js performance profiling
node --prof src/app.js

# Memory usage analysis
node --inspect src/app.js

# Load testing
npm run test:load
```

---

## 🔧 Maintenance Scripts

### Daily Maintenance
```bash
# Health check script
#!/bin/bash
curl -f https://api.mentra.com/health || echo "Health check failed"
docker stats --no-stream
df -h
```

### Weekly Maintenance
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Docker cleanup
docker system prune -f

# Log rotation
find /opt/mentra/logs -name "*.log" -mtime +7 -delete

# Backup verification
ls -la /opt/mentra/backups/ | tail -10
```

---

## 📞 Emergency Contacts

### Internal Escalation
1. **Dev Team**: @dev-team (Slack)
2. **DevOps**: @devops-team (Slack)
3. **On-call Engineer**: +1-xxx-xxx-xxxx
4. **CTO**: emergency-cto@company.com

### External Support
- **AWS Support**: https://console.aws.amazon.com/support/
- **Sentry**: https://sentry.io/support/
- **Database Provider**: Check specific provider support

---

## 🏷️ Quick Tags & Labels

### Git Tags
```bash
# Create release tag
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# List recent tags
git tag -l --sort=-version:refname | head -10
```

### Docker Tags
```bash
# Tag images for deployment
docker tag mentra-backend:latest mentra-backend:v1.0.0
docker tag mentra-frontend:latest mentra-frontend:v1.0.0

# Push to registry
docker push mentra-backend:v1.0.0
```

---

## 🔍 Log Locations

| Service | Log Location | Command |
|---------|--------------|---------|
| **Application** | `/opt/mentra/logs/app.log` | `tail -f /opt/mentra/logs/app.log` |
| **Nginx** | `/var/log/nginx/` | `sudo tail -f /var/log/nginx/error.log` |
| **Docker** | Docker logs | `docker-compose logs -f backend` |
| **PM2** | `/opt/mentra/logs/pm2-*.log` | `pm2 logs` |
| **System** | `/var/log/syslog` | `sudo tail -f /var/log/syslog` |

---

## 💡 Pro Tips

### Time-Saving Commands
```bash
# Alias for quick deployment
alias deploy-prod='cd /opt/mentra && ./scripts/deploy.sh production'

# Monitor multiple logs
multitail /var/log/nginx/access.log /opt/mentra/logs/app.log

# Quick environment switch
export NODE_ENV=staging && npm run migrate
```

### IDE/Editor Shortcuts
- **VSCode**: Ctrl+Shift+` (Open integrated terminal)
- **Vim**: `:term` (Open terminal in vim)
- **SSH**: Use SSH config for quick server access

### Automation Ideas
- Set up GitHub Actions for automated testing
- Use webhooks for automatic deployments
- Configure Slack notifications for deployment status
- Set up automated backup verification

---

*For complete documentation, see: [Configuration & Deployment Guide](configuration-deployment-guide.md)*

---

*Last Updated: January 15, 2024* 