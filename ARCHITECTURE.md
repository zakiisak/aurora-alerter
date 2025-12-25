# Architecture Overview

## System Design

The Aurora Alerter is a full-stack web application built with Node.js and React, designed to monitor aurora forecasts and send email alerts when conditions meet user-defined thresholds.

## Components

### Backend (Node.js/Express)

1. **Database Layer** (`src/db/database.js`)
   - SQLite database with three tables:
     - `users`: Email-based user accounts
     - `alerts`: User alert configurations (location, threshold)
     - `alert_notification_state`: Tracks last notification to prevent spam

2. **API Routes** (`src/routes/`)
   - `auth.js`: Email-based registration and login
   - `alerts.js`: CRUD operations for alerts

3. **Services** (`src/services/`)
   - `aurora.js`: Fetches data from NOAA API and finds closest coordinates
   - `alert.js`: Core alert checking logic with deduplication
   - `email.js`: MailerSend integration for sending notifications

4. **Background Jobs** (`src/jobs/`)
   - `scheduler.js`: Runs alert checks every 5 minutes using node-cron

### Frontend (React)

1. **Components** (`src/components/`)
   - `Login.jsx`: Email-based authentication UI
   - `AlertList.jsx`: Displays user's alerts with edit/delete
   - `AlertModal.jsx`: Map picker and threshold configuration

2. **State Management**
   - React hooks (useState, useEffect)
   - LocalStorage for session persistence

## Data Flow

### Alert Checking Process

1. **Scheduler** triggers every 5 minutes
2. **Fetch** latest aurora data from NOAA API
3. **For each alert**:
   - Find closest coordinate using Haversine distance
   - Check if aurora value >= threshold
   - Apply deduplication logic:
     - Send if: current value > last notified value OR 12 hours expired
   - Send email via MailerSend if conditions met
   - Update notification state in database

### Deduplication Logic

```
IF (current_aurora_value >= threshold) THEN
  IF (last_notified_at is NULL OR 
      last_notified_at < 12_hours_ago OR
      current_aurora_value > last_notified_value) THEN
    SEND_EMAIL()
    UPDATE last_notified_value = current_aurora_value
    UPDATE last_notified_at = NOW()
  END IF
END IF
```

## Key Features

### 1. Email-Based Authentication
- Simple email-only auth (no passwords)
- Structure allows easy extension to password-based auth
- Session stored in localStorage

### 2. Interactive Map Picker
- Leaflet.js map with click-to-select
- Manual coordinate input also available
- Default location: Fairbanks, Alaska

### 3. Threshold Configuration
- Slider range: 1-9 (aurora probability scale)
- Default: 5
- Integer values only

### 4. Smart Notifications
- Prevents spam with value-based deduplication
- 12-hour expiration allows re-notification
- HTML and plain text email formats
- Includes links to latest aurora image and forecast

## Database Schema

```sql
users:
  - id (INTEGER PRIMARY KEY)
  - email (TEXT UNIQUE)
  - created_at (DATETIME)

alerts:
  - id (INTEGER PRIMARY KEY)
  - user_id (INTEGER FOREIGN KEY)
  - latitude (REAL)
  - longitude (REAL)
  - threshold (INTEGER 1-9)
  - created_at (DATETIME)
  - updated_at (DATETIME)

alert_notification_state:
  - id (INTEGER PRIMARY KEY)
  - alert_id (INTEGER FOREIGN KEY UNIQUE)
  - last_notified_value (INTEGER)
  - last_notified_at (DATETIME)
```

## API Endpoints

- `POST /api/auth/register` - Register with email
- `POST /api/auth/login` - Login with email
- `GET /api/alerts` - Get user's alerts
- `POST /api/alerts` - Create alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert
- `GET /api/health` - Health check

## Environment Variables

- `PORT` - Server port (default: 4747)
- `MAILERSEND_API_KEY` - MailerSend API key (required)
- `MAILERSEND_SENDER_EMAIL` - Verified sender email (optional)
- `MAILERSEND_SENDER_NAME` - Sender name (optional)
- `DB_PATH` - SQLite database path (default: ./data/aurora.db)

## Extensibility

The codebase is structured to easily add:
- Password-based authentication
- Push notifications (web push, mobile)
- SMS notifications
- Multiple alert types
- User preferences
- Alert history/logs
- Webhook integrations

