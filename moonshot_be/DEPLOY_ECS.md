# Deployment Guide for Alibaba Cloud ECS

This guide outlines the steps to deploy the `moonshot_be` (Backend) application to an Alibaba Cloud ECS instance.

## Important: Migration from Vercel

Your backend was previously running on Vercel at `api.alphaflux.app`. After deploying to ECS:

1.  **Update DNS**: Point `api.alphaflux.app` to your ECS instance IP address (A record)
2.  **SSL Certificate**: Set up SSL for `api.alphaflux.app` using Certbot (covered in Section 5)
3.  **No Vercel Environment Changes Needed**: Since you're keeping the same domain, your frontend environment variables (`VITE_API_URL=https://api.alphaflux.app`) don't need to change
4.  **Delete Vercel Backend Deployment**: After confirming ECS works, delete the backend project from Vercel to avoid confusion

## Pre-deployment Checks

Before deploying, ensure the following:

1.  **Dependencies**: The `db:migrate` script uses `drizzle-kit`, which is listed in `devDependencies`.
    *   **Action**: When installing dependencies on the server, ensure you install *all* dependencies (do not use `--production` flag initially), OR move `drizzle-kit` to `dependencies` in `package.json`.
2.  **Environment Variables**: Ensure you have all production values for the variables listed in `src/config/env.ts`.
3.  **CORS**: Update `ALLOWED_ORIGINS` in your `.env` to match your production frontend domain.

## Prerequisites

*   **Alibaba Cloud ECS Instance**:
    *   OS: **Alibaba Cloud Linux 3** (Compatible with RHEL 8 / CentOS 8).
    *   Security Group: Allow Inbound traffic on ports `22` (SSH), `80` (HTTP), `443` (HTTPS), and `4000` (Application, if accessing directly).
*   **Database**:
    *   A PostgreSQL database (e.g., Alibaba Cloud RDS for PostgreSQL or a local Postgres instance on ECS).
    *   Connection string (`DATABASE_URL`).
*   **Domain Name** (Optional but recommended for SSL).

## 1. Server Setup

SSH into your ECS instance:
```bash
ssh root@<your-ecs-public-ip>
```

### Update System
```bash
sudo dnf update -y
```

### Install Node.js (v22)
Using NodeSource (RPM for RHEL/CentOS/Alibaba Linux):
```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
```
Verify installation:
```bash
node -v
npm -v
```

### Install PM2 (Process Manager)
PM2 is used to keep your application running in the background.
```bash
npm install -g pm2
```

### Install Nginx (Reverse Proxy)
```bash
sudo dnf install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 2. Application Setup

### Clone/Upload Code
You can clone your repository using Git.
Assuming you are deploying to `/root/code_deploy_application/moonshot_be`:

```bash
# 1. Install Git
sudo dnf install git -y

# 2. Create directory
mkdir -p /root/code_deploy_application

# 3. Clone the repository (replace with your actual repo URL)
git clone https://github.com/chow040/ultramagnus.git /root/code_deploy_application

# 4. Move to the backend folder
cd /root/code_deploy_application/moonshot_be
```

### Install Dependencies
```bash
# Install all dependencies (including devDependencies for building and migration)
npm install
```

### Configure Environment Variables
Create a `.env` file based on your local configuration.
```bash
cp .env.example .env
nano .env
```

**Critical Variables to Set:**
*   `NODE_ENV=production`
*   `PORT=4000`
*   `DATABASE_URL=postgresql://user:password@host:5432/dbname` (Your Supabase connection string)
*   `SESSION_SECRET=<generate-a-secure-random-string>`
*   `ALLOWED_ORIGINS=https://alphaflux.app` (Your frontend URL)
*   `FRONTEND_URL=https://alphaflux.app` (Your frontend URL)
*   `COOKIE_DOMAIN=.alphaflux.app` (For cookies to work across api.alphaflux.app and alphaflux.app)
*   API Keys (`OPENAI_API_KEY`, `FINNHUB_API_KEY`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.)

**Important:**
- `ALLOWED_ORIGINS` must exactly match your frontend URL: `https://alphaflux.app`
- `COOKIE_DOMAIN` is set to `.alphaflux.app` (with leading dot) so cookies work across both `alphaflux.app` and `api.alphaflux.app`

### Build the Application
```bash
npm run build
```
This will compile the TypeScript code into the `dist` directory.

### Run Database Migrations (Conditional)
**Only run this if you haven't updated your production Supabase schema yet.**
If you already ran `npm run db:migrate` from your local machine against the production database, you can skip this.

```bash
npm run db:migrate
```

## 3. Start Application with PM2

Recommended: use the ecosystem config to run both API and worker:
```bash
pm2 start pm2.config.cjs
pm2 save
pm2 startup
# Follow the instruction printed by the command above

# Optional: install log rotation module
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
```

If you only want the API (no worker), you can still run:
```bash
pm2 start dist/src/server.js --name "moonshot-be"
pm2 save
pm2 startup
# Follow the instruction printed by the command above
```

### Worker-only start/verify commands
- Start worker only: `pm2 start dist/src/workers/index.js --name "moonshot-worker"`
- Check status: `pm2 status`
- Tail logs: `pm2 logs moonshot-worker --lines 50`

## 4. Configure Nginx (Reverse Proxy)

**Note:** On Alibaba Cloud Linux 3 (RHEL-based), Nginx uses `/etc/nginx/conf.d/` instead of `sites-available/sites-enabled`.

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/conf.d/moonshot-be.conf
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name api.alphaflux.app;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Test and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```
## 5. SSL Setup (Required for Production)

**Important:** Before running Certbot, ensure:
1.  Your DNS A record for `api.alphaflux.app` points to this ECS instance's public IP
2.  Port 80 and 443 are open in your ECS security group

Install and run Certbot:

```bash
# Install Certbot and Nginx plugin
sudo dnf install certbot python3-certbot-nginx -y

# Run Certbot for api.alphaflux.app
sudo certbot --nginx -d api.alphaflux.app
```

Certbot will automatically:
- Obtain an SSL certificate from Let's Encrypt
- Update your Nginx configuration to use HTTPS
- Set up automatic certificate renewal

## 6. DNS & Vercel Configuration

### Update DNS
1.  Go to your DNS provider (where `alphaflux.app` is registered)
2.  Update the A record for `api.alphaflux.app` to point to your ECS public IP address
3.  Wait for DNS propagation (usually 5-15 minutes)

### Vercel Frontend (No Changes Required)
Since you're keeping the same domain (`api.alphaflux.app`), your Vercel frontend environment variables remain unchanged:
```
VITE_API_URL=https://api.alphaflux.app
```

### Clean Up Old Vercel Backend
After confirming the ECS backend works:
1.  Go to Vercel dashboard
2.  Delete the old `moonshot_be` backend project (keep only the frontend)
3.  This prevents confusion and potential API routing conflicts

## 7. Deploying Code Changes

After your initial deployment, follow these steps to deploy code updates:

### Quick Deployment Steps

```bash
# 1. SSH into your ECS instance
ssh root@<your-ecs-public-ip>

# 2. Navigate to the project directory
cd /root/code_deploy_application/moonshot_be

# 3. Pull the latest code from GitHub
git pull origin main

# 4. Install any new dependencies
npm install

# 5. Rebuild the application
npm run build

# 6. Run any new database migrations (if applicable)
npm run db:migrate

# 7. Restart the application with PM2
pm2 restart moonshot-be

# 8. Check that the application is running
pm2 status
pm2 logs moonshot-be --lines 50
```

### Detailed Deployment Workflow

#### Step 1: Commit and Push Changes

On your local machine:
```bash
# Ensure all changes are committed
git add .
git commit -m "Description of changes"
git push origin main
```

#### Step 2: Deploy to ECS

SSH into your server and deploy:
```bash
# SSH to server
ssh root@47.236.178.40  # Or your ECS IP

# Navigate to project
cd /root/code_deploy_application/moonshot_be

# Stash any local changes (if any)
git stash

# Pull latest code
git pull origin main

# Restore stashed changes if needed (usually not required)
# git stash pop

# Install dependencies (only if package.json changed)
npm install

# Build the TypeScript code
npm run build

# Run migrations (only if schema changed)
npm run db:migrate

# Restart the application
pm2 restart moonshot-be

# Verify deployment
pm2 status
pm2 logs moonshot-be --lines 30
```

#### Step 3: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check recent logs for errors
pm2 logs moonshot-be --lines 50

# Test the API endpoint
curl https://api.alphaflux.app
# Should return: {"error":"Not Found",...} if working

# Check specific endpoint (replace with your actual endpoint)
curl https://api.alphaflux.app/api/health
```

### Database Migration Strategy

If you have database schema changes:

1.  **Test locally first:**
    ```bash
    # On local machine
    npm run db:generate  # Generate migration from schema changes
    npm run db:migrate   # Test migration locally
    ```

2.  **Commit migration files:**
    ```bash
    git add drizzle/
    git commit -m "Add migration for [feature]"
    git push
    ```

3.  **Deploy with migration:**
    ```bash
    # On ECS server
    cd /root/code_deploy_application/moonshot_be
    git pull
    npm run db:migrate  # Apply migration to production database
    npm run build
    pm2 restart moonshot-be
    ```

### Environment Variable Changes

If you need to update environment variables:

```bash
# SSH to server
ssh root@47.236.178.40

# Edit .env file
cd /root/code_deploy_application/moonshot_be
nano .env

# Make your changes, save and exit (Ctrl+O, Enter, Ctrl+X)

# Restart the application to pick up new env vars
pm2 restart moonshot-be
```

**Note:** `.env` files are not committed to Git. Keep a secure backup of your production `.env` file.

### Zero-Downtime Deployment (Advanced)

For zero-downtime deployments, use PM2's reload feature:

```bash
# Instead of 'pm2 restart', use:
pm2 reload moonshot-be

# This performs a rolling restart with no downtime
```

**Requirements for `pm2 reload`:**
- Application must handle graceful shutdown (close connections properly)
- Database migrations should be backward-compatible during transition

### Rollback Procedure

If a deployment causes issues:

```bash
# SSH to server
ssh root@47.236.178.40

# Navigate to project
cd /root/code_deploy_application/moonshot_be

# Check git log to find the last working commit
git log --oneline -10

# Rollback to previous commit (replace <commit-hash>)
git reset --hard <commit-hash>

# Rebuild and restart
npm run build
pm2 restart moonshot-be

# Verify rollback
pm2 logs moonshot-be --lines 30
```

### Common Deployment Issues

**Issue: Application won't start after deployment**
```bash
# Check logs for errors
pm2 logs moonshot-be --err --lines 100

# Common causes:
# - Missing environment variables
# - TypeScript compilation errors
# - Database connection issues
```

**Issue: Build fails**
```bash
# Clear node_modules and rebuild
rm -rf node_modules
rm -rf dist
npm install
npm run build
```

**Issue: Migration fails**
```bash
# Check migration status
npm run db:generate

# If migration is stuck, check database directly
# Contact DBA or check Supabase dashboard
```

### Deployment Checklist

- [ ] Code changes committed and pushed to GitHub
- [ ] Tests passing locally (if applicable)
- [ ] SSH into ECS server
- [ ] Pull latest code
- [ ] Install dependencies (if package.json changed)
- [ ] Build application
- [ ] Run migrations (if schema changed)
- [ ] Restart PM2 process
- [ ] Verify application is running (`pm2 status`)
- [ ] Check logs for errors (`pm2 logs`)
- [ ] Test API endpoints (curl or browser)
- [ ] Monitor for issues (check logs after 5-10 minutes)

## Troubleshooting

*   **Check Logs:**
    *   PM2 logs: `pm2 logs moonshot-be`
    *   Nginx logs: `/var/log/nginx/error.log`
*   **Database Connection:** Ensure the ECS security group allows outbound traffic to your Supabase instance.
*   **CORS Issues:** If you get CORS errors from Vercel, double-check that `ALLOWED_ORIGINS` in your backend `.env` exactly matches your Vercel URL (including `https://`).
*   **Cookies Not Working:** If authentication cookies aren't working, ensure `COOKIE_DOMAIN` is empty or omitted in your backend `.env`.
