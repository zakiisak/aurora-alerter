# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your MailerSend API key:
   ```
   MAILERSEND_API_KEY=your_mailersend_api_key_here
   PORT=3000
   DB_PATH=./data/aurora.db
   ```

3. **Get MailerSend API Key**
   - Sign up at https://www.mailersend.com
   - Go to Settings > API Tokens
   - Create a new token with email sending permissions
   - Add it to your `.env` file as `MAILERSEND_API_KEY`

4. **Configure MailerSend Sender Email** (Optional but recommended)
   - In MailerSend, go to Sending > Domains
   - Add and verify your domain, OR use the test domain provided
   - Add the sender email to your `.env`:
     ```
     MAILERSEND_SENDER_EMAIL=noreply@yourdomain.com
     MAILERSEND_SENDER_NAME=Aurora Alerter
     ```
   - If not set, defaults will be used (may not work without verified domain)

5. **Run the Application**

   **Development Mode (Recommended for first run):**
   ```bash
   # Terminal 1: Start backend
   npm run dev
   
   # Terminal 2: Start frontend dev server
   npm run dev:frontend
   ```
   
   Then open http://localhost:5173 in your browser.

   **Production Mode:**
   ```bash
   npm run build:start
   ```
   
   Then open http://localhost:3000 in your browser.

## How It Works

1. **User Registration/Login**: Simple email-based authentication (no password required)

2. **Create Alerts**: 
   - Click on the map to select a location
   - Set an aurora probability threshold (1-9)
   - Save the alert

3. **Background Monitoring**:
   - Every 5 minutes, the system fetches latest aurora data from NOAA
   - For each alert, it finds the closest coordinate
   - If the aurora value meets or exceeds the threshold, an email is sent

4. **Email Notifications**:
   - Includes links to latest aurora image and forecast
   - Smart deduplication: only sends if value increased OR 12 hours passed since last notification

## Database

The application uses SQLite, stored in `./data/aurora.db` by default. The database is automatically created on first run.

## Troubleshooting

- **Frontend not loading**: Make sure you've run `npm run build` for production mode
- **Email not sending**: Check your MailerSend API key in `.env`
- **Database errors**: Delete `./data/aurora.db` to reset (you'll lose all data)

