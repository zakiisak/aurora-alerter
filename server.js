/**
 * Main Express server
 * Aurora Alerter Application
 */

// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import db from './src/db/database.js';
import authRoutes from './src/routes/auth.js';
import alertRoutes from './src/routes/alerts.js';
import { startScheduler } from './src/jobs/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4747;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory (for built frontend)
app.use(express.static(path.join(__dirname, 'public')));
// Also serve from dist if it exists (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);

// Serve frontend - try dist first (production build), then root index.html
app.get('*', (req, res, next) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Try dist first (Vite production build)
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  } else if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  } else {
    return res.status(404).send('Frontend not found. Please run "npm run build" first.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aurora Alerter server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_PATH || './data/aurora.db'}`);
  
  // Check for required environment variables
  if (!process.env.MAILERSEND_API_KEY) {
    console.warn('\n⚠️  WARNING: MAILERSEND_API_KEY is not set!');
    console.warn('   Email notifications will not work.');
    console.warn('   Please create a .env file with your MailerSend API key.');
    console.warn('   See .env.example for the format.\n');
  } else {
    console.log('✅ MailerSend API key configured');
  }
  
  // Start background job scheduler
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing database...');
  db.close();
  process.exit(0);
});

