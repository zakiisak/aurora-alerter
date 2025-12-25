/**
 * Alert routes
 * CRUD operations for user alerts
 */

import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Simple middleware to get user from email (in production, use proper session/auth)
const getUserFromEmail = (req, res, next) => {
  const email = req.headers['x-user-email'];
  
  if (!email) {
    return res.status(401).json({ error: 'Email required in x-user-email header' });
  }

  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase().trim());
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
};

// Apply middleware to all routes
router.use(getUserFromEmail);

/**
 * Get all alerts for the current user
 * GET /api/alerts
 */
router.get('/', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT 
        a.id,
        a.latitude,
        a.longitude,
        a.threshold,
        a.created_at,
        a.updated_at,
        ans.last_notified_value,
        ans.last_notified_at
      FROM alerts a
      LEFT JOIN alert_notification_state ans ON a.id = ans.alert_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * Create a new alert
 * POST /api/alerts
 * Body: { latitude: number, longitude: number, threshold: number }
 */
router.post('/', (req, res) => {
  try {
    const { latitude, longitude, threshold } = req.body;

    // Validation
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Valid latitude (-90 to 90) is required' });
    }

    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Valid longitude (-180 to 180) is required' });
    }

    if (typeof threshold !== 'number' || threshold < 1 || threshold > 9 || !Number.isInteger(threshold)) {
      return res.status(400).json({ error: 'Valid threshold (1-9 integer) is required' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO alerts (user_id, latitude, longitude, threshold, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, latitude, longitude, threshold, now, now);

    const alert = db.prepare(`
      SELECT 
        a.id,
        a.latitude,
        a.longitude,
        a.threshold,
        a.created_at,
        a.updated_at
      FROM alerts a
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, alert });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * Update an alert
 * PUT /api/alerts/:id
 * Body: { latitude?: number, longitude?: number, threshold?: number }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, threshold } = req.body;

    // Check if alert exists and belongs to user
    const existing = db.prepare('SELECT * FROM alerts WHERE id = ? AND user_id = ?').get(id, req.user.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (latitude !== undefined) {
      if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: 'Valid latitude (-90 to 90) is required' });
      }
      updates.push('latitude = ?');
      values.push(latitude);
    }

    if (longitude !== undefined) {
      if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: 'Valid longitude (-180 to 180) is required' });
      }
      updates.push('longitude = ?');
      values.push(longitude);
    }

    if (threshold !== undefined) {
      if (typeof threshold !== 'number' || threshold < 1 || threshold > 9 || !Number.isInteger(threshold)) {
        return res.status(400).json({ error: 'Valid threshold (1-9 integer) is required' });
      }
      updates.push('threshold = ?');
      values.push(threshold);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id, req.user.id);

    db.prepare(`
      UPDATE alerts 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(...values);

    // Fetch updated alert
    const alert = db.prepare(`
      SELECT 
        a.id,
        a.latitude,
        a.longitude,
        a.threshold,
        a.created_at,
        a.updated_at,
        ans.last_notified_value,
        ans.last_notified_at
      FROM alerts a
      LEFT JOIN alert_notification_state ans ON a.id = ans.alert_id
      WHERE a.id = ? AND a.user_id = ?
    `).get(id, req.user.id);

    res.json({ success: true, alert });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

/**
 * Delete an alert
 * DELETE /api/alerts/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if alert exists and belongs to user
    const existing = db.prepare('SELECT id FROM alerts WHERE id = ? AND user_id = ?').get(id, req.user.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Delete alert (cascade will handle notification state)
    db.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').run(id, req.user.id);

    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;

