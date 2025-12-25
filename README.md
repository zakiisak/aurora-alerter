# Aurora Alerter

A simple web application that monitors aurora forecasts and sends email alerts when conditions meet your specified thresholds.

## Features

- Email-based authentication (no password required)
- Interactive map to select alert locations
- Configurable aurora probability thresholds (1-9)
- Automatic background checking every 5 minutes
- Email notifications via MailerSend
- Smart deduplication to prevent spam

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Add your MailerSend API key to `.env`:
```
MAILERSEND_API_KEY=your_api_key_here
```

### Development Mode

For development, run the backend and frontend separately:

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

Then open `http://localhost:5173` in your browser.

### Production Mode

Build the frontend and start the server:

```bash
npm run build:start
```

Or build separately:
```bash
npm run build
npm start
```

Then open `http://localhost:4747` in your browser.

## Project Structure

```
aurora-alerter/
├── server.js              # Main Express server
├── src/
│   ├── db/
│   │   └── database.js    # SQLite database setup
│   ├── routes/            # API routes (auth, alerts)
│   ├── services/          # Business logic
│   │   ├── aurora.js      # Aurora data fetching
│   │   ├── alert.js       # Alert checking logic
│   │   └── email.js       # Email notifications
│   └── jobs/              # Background jobs (scheduler)
├── src/                   # React frontend source
│   ├── components/        # React components
│   ├── App.jsx            # Main app component
│   └── main.jsx           # React entry point
├── public/                # Static files
└── dist/                  # Built frontend (generated)
```

## API Endpoints

- `POST /api/auth/login` - Login with email
- `POST /api/auth/register` - Register with email
- `GET /api/alerts` - Get user's alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

