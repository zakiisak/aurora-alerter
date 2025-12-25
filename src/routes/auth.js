/**
 * Authentication routes
 * Simple email-based auth (no password)
 */

import express from 'express';
import db from '../db/database.js';

const router = express.Router();

/**
 * Register a new user with email
 * POST /api/auth/register
 * Body: { email: string }
 */
router.post('/register', (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = db.prepare('SELECT id, email FROM users WHERE email = ?').get(normalizedEmail);
    
    if (existing) {
      // User exists, return success (idempotent)
      return res.json({
        success: true,
        user: { id: existing.id, email: existing.email },
        message: 'User already exists'
      });
    }

    // Create new user
    const result = db.prepare('INSERT INTO users (email) VALUES (?)').run(normalizedEmail);
    
    res.json({
      success: true,
      user: { id: result.lastInsertRowid, email: normalizedEmail },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Login with email
 * POST /api/auth/login
 * Body: { email: string }
 */
router.post('/login', (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(normalizedEmail);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    res.json({
      success: true,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;

