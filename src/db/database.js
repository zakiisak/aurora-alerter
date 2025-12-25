import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/aurora.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Users table (email-based auth)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Alerts table
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    threshold INTEGER NOT NULL CHECK(threshold >= 1 AND threshold <= 9),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Alert notification state (tracks last notified value and timestamp)
  CREATE TABLE IF NOT EXISTS alert_notification_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL UNIQUE,
    last_notified_value INTEGER,
    last_notified_at DATETIME,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
  );

  -- Aurora data history (stores historical aurora values for alerts)
  CREATE TABLE IF NOT EXISTS aurora_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    aurora_value INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_coords ON alerts(latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_aurora_history_alert_id ON aurora_history(alert_id);
  CREATE INDEX IF NOT EXISTS idx_aurora_history_recorded_at ON aurora_history(recorded_at);
`);

export default db;

