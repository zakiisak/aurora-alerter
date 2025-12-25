# Deployment Guide

This guide explains how to deploy the Aurora Alerter application with nginx.

## Architecture

- **Frontend**: `aurora.icurety.com` → `localhost:4748`
- **Backend**: `backend.aurora.icurety.com` → `localhost:4747`

## Prerequisites

1. Node.js installed on the server
2. nginx installed and running
3. SSL certificates for both domains (Let's Encrypt recommended)
4. Domain DNS records pointing to your server

## Step 1: Build the Application

```bash
# Navigate to project directory
cd /path/to/aurora-alerter

# Install dependencies
npm install

# Build the frontend
npm run build
```

The built frontend will be in the `dist/` directory.

## Step 2: Configure Backend Port

Update your `.env` file to set the backend port:

```env
PORT=4747
MAILERSEND_API_KEY=your_api_key_here
MAILERSEND_SENDER_EMAIL=noreply@yourdomain.com
MAILERSEND_SENDER_NAME=Aurora Alerter
DB_PATH=./data/aurora.db
```

## Step 3: Set Up Process Manager (PM2)

Install PM2 to keep the backend running:

```bash
npm install -g pm2
```

Start the backend:

```bash
# From the project root
pm2 start server.js --name aurora-backend

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

## Step 4: Configure nginx

### 4.1 Copy nginx Configuration Files

```bash
# Copy frontend config
sudo cp nginx/aurora-frontend.conf /etc/nginx/sites-available/aurora-frontend.conf

# Copy backend config
sudo cp nginx/aurora-backend.conf /etc/nginx/sites-available/aurora-backend.conf
```

### 4.2 Update Configuration Paths

Edit the frontend config:

```bash
sudo nano /etc/nginx/sites-available/aurora-frontend.conf
```

Update the `root` directive to point to your built frontend:

```nginx
root /path/to/aurora-alerter/dist;
```

### 4.3 Update SSL Certificate Paths

Update the SSL certificate paths in both config files to match your Let's Encrypt certificates:

```nginx
ssl_certificate /etc/letsencrypt/live/aurora.icurety.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/aurora.icurety.com/privkey.pem;
```

### 4.4 Enable Sites

```bash
# Create symlinks to enable sites
sudo ln -s /etc/nginx/sites-available/aurora-frontend.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/aurora-backend.conf /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 5: Set Up SSL Certificates (Let's Encrypt)

If you haven't already set up SSL certificates:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificates for both domains
sudo certbot --nginx -d aurora.icurety.com
sudo certbot --nginx -d backend.aurora.icurety.com

# Certificates will auto-renew, but you can test renewal:
sudo certbot renew --dry-run
```

## Step 6: Configure Firewall

Allow necessary ports:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow your backend port (if needed for direct access)
sudo ufw allow 4747/tcp
```

## Step 7: Verify Deployment

1. **Check Backend**: Visit `https://backend.aurora.icurety.com/api/health`
   - Should return: `{"status":"ok","timestamp":"...","database":"connected"}`

2. **Check Frontend**: Visit `https://aurora.icurety.com`
   - Should load the login page

3. **Test API**: The frontend should be able to make API calls to the backend

## Step 8: Set Up Frontend Server (Optional)

If you want to serve the frontend from a separate process instead of nginx static files:

### Option A: Serve with nginx (Recommended)
The nginx config already handles this - just point `root` to your `dist/` directory.

### Option B: Serve with Node.js/Express
You can also run the frontend on port 4748 and proxy through nginx:

```bash
# Install serve
npm install -g serve

# Start frontend server
pm2 start "serve -s dist -l 4748" --name aurora-frontend
```

Then update nginx frontend config to proxy instead of serving static files:

```nginx
location / {
    proxy_pass http://localhost:4748;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Monitoring and Logs

### PM2 Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs aurora-backend

# Restart backend
pm2 restart aurora-backend

# Stop backend
pm2 stop aurora-backend
```

### nginx Logs

```bash
# Frontend access logs
sudo tail -f /var/log/nginx/aurora-frontend-access.log

# Frontend error logs
sudo tail -f /var/log/nginx/aurora-frontend-error.log

# Backend access logs
sudo tail -f /var/log/nginx/aurora-backend-access.log

# Backend error logs
sudo tail -f /var/log/nginx/aurora-backend-error.log
```

## Troubleshooting

### Backend not responding
1. Check if PM2 process is running: `pm2 list`
2. Check backend logs: `pm2 logs aurora-backend`
3. Verify port 4747 is accessible: `curl http://localhost:4747/api/health`

### Frontend not loading
1. Check nginx status: `sudo systemctl status nginx`
2. Check nginx config: `sudo nginx -t`
3. Verify dist directory exists and has files
4. Check nginx error logs

### SSL certificate issues
1. Verify certificates exist: `sudo certbot certificates`
2. Test renewal: `sudo certbot renew --dry-run`
3. Check certificate paths in nginx config

### CORS errors
- Verify `Access-Control-Allow-Origin` header in backend nginx config matches your frontend domain
- Check that frontend is making requests to `https://backend.aurora.icurety.com`

## Updating the Application

When you need to update:

```bash
# Pull latest changes
git pull

# Install/update dependencies
npm install

# Rebuild frontend
npm run build

# Restart backend
pm2 restart aurora-backend

# Reload nginx (if config changed)
sudo nginx -t && sudo systemctl reload nginx
```

## Security Considerations

1. **Environment Variables**: Keep `.env` file secure, never commit it
2. **Database**: Regular backups of `data/aurora.db`
3. **SSL**: Keep certificates updated (Let's Encrypt auto-renews)
4. **Firewall**: Only expose necessary ports
5. **Updates**: Keep Node.js, nginx, and dependencies updated

