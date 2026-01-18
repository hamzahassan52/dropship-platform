# AWS EC2 Deployment Guide - Dropship Platform

> Complete A to Z guide for deploying to AWS EC2

---

## Table of Contents

1. [EC2 Instance Create Karna](#step-1-ec2-instance-create-karna)
2. [Security Group Configure Karna](#step-2-security-group-configure-karna)
3. [EC2 Se Connect Karna (SSH)](#step-3-ec2-se-connect-karna-ssh)
4. [Server Setup - Dependencies Install](#step-4-server-setup---dependencies-install)
5. [PostgreSQL Setup](#step-5-postgresql-setup)
6. [Project Clone Aur Setup](#step-6-project-clone-aur-setup)
7. [Environment Variables Configure](#step-7-environment-variables-configure)
8. [Build Aur Run](#step-8-build-aur-run)
9. [PM2 Se Production Run](#step-9-pm2-se-production-run)
10. [Nginx Reverse Proxy Setup](#step-10-nginx-reverse-proxy-setup)
11. [SSL Certificate (HTTPS)](#step-11-ssl-certificate-https)
12. [Domain Connect Karna](#step-12-domain-connect-karna)
13. [Useful Commands](#useful-commands)

---

## Step 1: EC2 Instance Create Karna

### AWS Console Pe Jayen
1. https://console.aws.amazon.com pe login karen
2. Search bar mein "EC2" type karen aur click karen

### Launch Instance
1. **"Launch Instance"** button click karen
2. **Name**: `dropship-platform`
3. **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
4. **Instance Type**:
   - Testing: `t2.micro` (Free tier)
   - Production: `t2.small` ya `t2.medium` (recommended)
5. **Key Pair**:
   - "Create new key pair" click karen
   - Name: `dropship-key`
   - Type: RSA
   - Format: `.pem`
   - **Download karen aur safe rakhen!**
6. **Network Settings**: Default rakhen (abhi)
7. **Storage**: 20 GB (minimum)
8. **"Launch Instance"** click karen

---

## Step 2: Security Group Configure Karna

EC2 Dashboard > Security Groups > apni instance ki security group select karen

### Inbound Rules Add Karen

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | My IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |
| Custom TCP | 4000 | 0.0.0.0/0 | API (temporary, baad mein remove) |
| Custom TCP | 3000 | 0.0.0.0/0 | Frontend (temporary) |
| PostgreSQL | 5432 | 127.0.0.1/32 | Database (localhost only) |

### Steps:
1. Security Group select karen
2. "Edit inbound rules" click karen
3. "Add rule" se upar wali rules add karen
4. "Save rules"

---

## Step 3: EC2 Se Connect Karna (SSH)

### Key File Permission Set Karen (Local Machine)
```bash
# Mac/Linux
chmod 400 ~/Downloads/dropship-key.pem

# Windows (PowerShell as Admin)
icacls dropship-key.pem /inheritance:r /grant:r "$($env:USERNAME):R"
```

### SSH Connect Karen
```bash
# EC2 Dashboard se Public IP copy karen
ssh -i ~/Downloads/dropship-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Example:
ssh -i ~/Downloads/dropship-key.pem ubuntu@54.123.45.67
```

### First Time "yes" type karen fingerprint ke liye

---

## Step 4: Server Setup - Dependencies Install

### System Update
```bash
sudo apt update && sudo apt upgrade -y
```

### Node.js 20 Install (via NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x
```

### pnpm Install
```bash
sudo npm install -g pnpm
pnpm -v
```

### PM2 Install
```bash
sudo npm install -g pm2
pm2 -v
```

### Git Install (usually pre-installed)
```bash
sudo apt install -y git
git --version
```

### Build Tools
```bash
sudo apt install -y build-essential
```

---

## Step 5: PostgreSQL Setup

### Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Database Aur User Create Karen
```bash
# PostgreSQL shell mein jayen
sudo -u postgres psql

# SQL commands run karen:
CREATE USER dropship WITH PASSWORD 'YourStrongPassword123!';
CREATE DATABASE dropship_db OWNER dropship;
GRANT ALL PRIVILEGES ON DATABASE dropship_db TO dropship;
\q
```

### Connection Test Karen
```bash
psql -h localhost -U dropship -d dropship_db
# Password enter karen: YourStrongPassword123!
# Exit: \q
```

---

## Step 6: Project Clone Aur Setup

### Project Directory Create Karen
```bash
cd ~
mkdir -p projects
cd projects
```

### Git Clone Karen
```bash
# HTTPS se clone
git clone https://github.com/YOUR_USERNAME/dropship-platform.git

# Ya SSH se (if SSH key configured)
git clone git@github.com:YOUR_USERNAME/dropship-platform.git

cd dropship-platform
```

### Dependencies Install Karen
```bash
pnpm install
```

### Prisma Setup
```bash
cd apps/api
npx prisma generate
```

---

## Step 7: Environment Variables Configure

### Backend (.env)
```bash
cd ~/projects/dropship-platform/apps/api
nano .env
```

### Paste karen (values change karen):
```env
# Server
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Database (jo Step 5 mein banaya)
DATABASE_URL="postgresql://dropship:YourStrongPassword123!@localhost:5432/dropship_db"

# JWT Secret (generate karen: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this

# CJ Dropshipping
CJ_EMAIL=your-cj-email@example.com
CJ_PASSWORD=your-cj-password
CJ_SIMULATION_MODE=false

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=admin@yourdomain.com

# Groq API (for AI Chat)
GROQ_API_KEY=your-groq-api-key

# Automation
AUTO_FULFILL_ENABLED=true
AUTO_SYNC_TRACKING_ENABLED=true
AUTO_SYNC_INVENTORY_ENABLED=true
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Frontend (.env.local)
```bash
cd ~/projects/dropship-platform/apps/web
nano .env.local
```

### Paste karen:
```env
# API
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-change-this

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

---

## Step 8: Build Aur Run

### Database Migrate Karen
```bash
cd ~/projects/dropship-platform/apps/api
npx prisma migrate deploy
```

### Backend Build Karen
```bash
cd ~/projects/dropship-platform/apps/api
npm run build
```

### Frontend Build Karen
```bash
cd ~/projects/dropship-platform/apps/web
npm run build
```

### Test Run Karen (temporary)
```bash
# Terminal 1: Backend
cd ~/projects/dropship-platform/apps/api
node dist/main.js

# Terminal 2 (new SSH session): Frontend
cd ~/projects/dropship-platform/apps/web
npm run start
```

Browser mein check karen: `http://YOUR_EC2_IP:3000`

---

## Step 9: PM2 Se Production Run

### PM2 Ecosystem File Already Hai
```bash
cd ~/projects/dropship-platform/apps/api
```

### Backend Start Karen
```bash
pm2 start ecosystem.config.js --env production
```

### Frontend Ke Liye PM2 Config Banao
```bash
cd ~/projects/dropship-platform/apps/web
nano ecosystem.config.js
```

### Paste karen:
```javascript
module.exports = {
  apps: [
    {
      name: 'dropship-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

### Frontend Start Karen
```bash
pm2 start ecosystem.config.js
```

### PM2 Status Check Karen
```bash
pm2 list
pm2 logs
```

### PM2 Startup (Auto-start on reboot)
```bash
pm2 startup
# Jo command dikhai de, wo copy paste karen
pm2 save
```

---

## Step 10: Nginx Reverse Proxy Setup

### Nginx Install Karen
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### API Configuration
```bash
sudo nano /etc/nginx/sites-available/api.yourdomain.com
```

### Paste karen:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### Frontend Configuration
```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

### Paste karen:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
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

### Sites Enable Karen
```bash
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
```

### Nginx Test Aur Restart
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 11: SSL Certificate (HTTPS)

### Certbot Install Karen
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### SSL Certificates Generate Karen
```bash
# API ke liye
sudo certbot --nginx -d api.yourdomain.com

# Frontend ke liye
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Auto-Renewal Test Karen
```bash
sudo certbot renew --dry-run
```

---

## Step 12: Domain Connect Karna

### DNS Records Setup (Domain Provider mein)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_EC2_PUBLIC_IP | 300 |
| A | www | YOUR_EC2_PUBLIC_IP | 300 |
| A | api | YOUR_EC2_PUBLIC_IP | 300 |

### Elastic IP (Recommended)
EC2 ka IP restart pe change ho sakta hai. Elastic IP use karen:

1. EC2 Dashboard > Elastic IPs
2. "Allocate Elastic IP address"
3. "Associate Elastic IP address"
4. Apni instance select karen
5. DNS records mein Elastic IP use karen

---

## Useful Commands

### PM2 Commands
```bash
pm2 list              # All apps status
pm2 logs              # View all logs
pm2 logs dropship-api # Specific app logs
pm2 restart all       # Restart all
pm2 stop all          # Stop all
pm2 delete all        # Remove all
pm2 monit             # Real-time monitoring
```

### Nginx Commands
```bash
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t                    # Test config
sudo tail -f /var/log/nginx/error.log
```

### PostgreSQL Commands
```bash
sudo systemctl status postgresql
sudo -u postgres psql            # Enter psql
\l                               # List databases
\c dropship_db                   # Connect to db
\dt                              # List tables
```

### Server Commands
```bash
df -h                # Disk space
free -m              # Memory
htop                 # Process monitor (install: sudo apt install htop)
```

### Update/Redeploy
```bash
cd ~/projects/dropship-platform
git pull origin main

# Backend
cd apps/api
npm run build
pm2 restart dropship-api

# Frontend
cd ../web
npm run build
pm2 restart dropship-web
```

---

## Troubleshooting

### Port Already In Use
```bash
sudo lsof -i :4000
sudo kill -9 PID
```

### PM2 Not Starting
```bash
pm2 logs dropship-api --lines 100
```

### Nginx 502 Bad Gateway
```bash
# Check if app is running
pm2 list
# Check nginx config
sudo nginx -t
# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Database Connection Error
```bash
# Test connection
psql -h localhost -U dropship -d dropship_db
# Check PostgreSQL status
sudo systemctl status postgresql
```

### SSL Certificate Issues
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```

---

## Security Checklist

- [ ] SSH key use karen, password disable karen
- [ ] Firewall (UFW) enable karen
- [ ] Security Group mein sirf required ports open karen
- [ ] Environment variables mein strong passwords use karen
- [ ] Regular updates: `sudo apt update && sudo apt upgrade`
- [ ] PM2 logs regularly check karen
- [ ] Database backup setup karen

### UFW Firewall Setup
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | https://yourdomain.com |
| API | 4000 | https://api.yourdomain.com |
| PostgreSQL | 5432 | localhost only |
| Nginx | 80, 443 | Reverse proxy |

---

**Deployment Complete!**

Agar koi issue aaye to PM2 logs check karen aur troubleshooting section dekhen.
