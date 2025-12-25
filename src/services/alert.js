/**
 * Alert checking service
 * Checks all alerts against latest aurora data and sends notifications
 */

import db from '../db/database.js';
import { fetchAuroraData, findClosestCoordinate } from './aurora.js';
import { sendAuroraAlert } from './email.js';
import { getCachedCityName } from './geocoding.js';

/**
 * Check all active alerts against latest aurora data
 * This is called by the background job every 5 minutes
 */
export async function checkAllAlerts() {
  console.log('[Alert Check] Starting alert check...');
  
  try {
    // Fetch latest aurora data
    const auroraData = await fetchAuroraData();
    const coordinates = auroraData.coordinates || [];
    
    if (coordinates.length === 0) {
      console.warn('[Alert Check] No coordinates in aurora data');
      return;
    }

    // Get all active alerts
    const alerts = db.prepare(`
      SELECT 
        a.id,
        a.user_id,
        a.latitude,
        a.longitude,
        a.threshold,
        a.increment_threshold,
        u.email,
        ans.last_notified_value,
        ans.last_notified_at
      FROM alerts a
      INNER JOIN users u ON a.user_id = u.id
      LEFT JOIN alert_notification_state ans ON a.id = ans.alert_id
    `).all();

    console.log(`[Alert Check] Checking ${alerts.length} alerts...`);

    let notificationsSent = 0;

    for (const alert of alerts) {
      try {
        // Store history data for this alert
        await storeAuroraHistory(alert, coordinates);
        
        // Check if notification should be sent
        const shouldNotify = await checkSingleAlert(alert, coordinates);
        if (shouldNotify) {
          notificationsSent++;
        }
      } catch (error) {
        console.error(`[Alert Check] Error checking alert ${alert.id}:`, error);
      }
    }

    console.log(`[Alert Check] Completed. Sent ${notificationsSent} notifications.`);
  } catch (error) {
    console.error('[Alert Check] Error during alert check:', error);
  }
}

/**
 * Check a single alert against aurora data
 * @param {Object} alert - Alert record from database
 * @param {Array} coordinates - Aurora coordinate data
 * @returns {Promise<boolean>} True if notification was sent
 */
async function checkSingleAlert(alert, coordinates) {
  // Find closest coordinate
  const closest = findClosestCoordinate(
    coordinates,
    alert.latitude,
    alert.longitude
  );

  if (!closest || closest.aurora === undefined) {
    console.warn(`[Alert Check] No aurora data found for alert ${alert.id}`);
    return false;
  }

  const currentAuroraValue = closest.aurora;
  const threshold = alert.threshold;
  const incrementThreshold = alert.increment_threshold || 10; // Default to 10 if not set

  // Check if threshold is met
  if (currentAuroraValue < threshold) {
    return false;
  }

  // Check deduplication logic
  const lastNotifiedValue = alert.last_notified_value;
  const lastNotifiedAt = alert.last_notified_at 
    ? new Date(alert.last_notified_at) 
    : null;

  // 12-hour expiration check
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const isExpired = !lastNotifiedAt || lastNotifiedAt < twelveHoursAgo;

  // If never notified before, always notify when threshold is met (already checked above)
  if (lastNotifiedValue === null) {
    // First notification - threshold already met, so notify
    // (increment_threshold doesn't apply to first notification)
  } else {
    // Calculate increase from last notified value
    const increase = currentAuroraValue - lastNotifiedValue;
    
    // Only notify if:
    // 1. Last notification expired (12 hours passed), OR
    // 2. Current value increased by at least increment_threshold from last notified value
    if (!isExpired && increase < incrementThreshold) {
      console.log(
        `[Alert Check] Skipping alert ${alert.id}: ` +
        `current=${currentAuroraValue}, last=${lastNotifiedValue}, ` +
        `increase=${increase}, required=${incrementThreshold}, expired=${isExpired}`
      );
      return false;
    }
  }

  if (!shouldNotify) {
    console.log(
      `[Alert Check] Skipping alert ${alert.id}: ` +
      `current=${currentAuroraValue}, last=${lastNotifiedValue}, ` +
      `increase=${increase}, required=${incrementThreshold}, expired=${isExpired}`
    );
    return false;
  }

  // Send notification
  try {
    // Get city name for the alert location
    const cityName = await getCachedCityName(alert.latitude, alert.longitude);
    
    await sendAuroraAlert(alert.email, {
      auroraValue: currentAuroraValue,
      threshold,
      latitude: alert.latitude,
      longitude: alert.longitude,
      cityName,
    });

    // Update notification state
    updateNotificationState(alert.id, currentAuroraValue);

    console.log(
      `[Alert Check] Notification sent for alert ${alert.id} ` +
      `(value: ${currentAuroraValue}, threshold: ${threshold})`
    );

    return true;
  } catch (error) {
    console.error(`[Alert Check] Failed to send notification for alert ${alert.id}:`, error);
    return false;
  }
}

/**
 * Store aurora history data for an alert
 * @param {Object} alert - Alert record
 * @param {Array} coordinates - Aurora coordinate data
 */
async function storeAuroraHistory(alert, coordinates) {
  const closest = findClosestCoordinate(
    coordinates,
    alert.latitude,
    alert.longitude
  );

  if (!closest || closest.aurora === undefined) {
    return;
  }

  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO aurora_history (alert_id, aurora_value, recorded_at)
    VALUES (?, ?, ?)
  `).run(alert.id, closest.aurora, now);
}

/**
 * Update notification state after sending an alert
 * @param {number} alertId - Alert ID
 * @param {number} auroraValue - Aurora value that triggered notification
 */
function updateNotificationState(alertId, auroraValue) {
  const now = new Date().toISOString();
  
  // Use INSERT OR REPLACE to handle both new and existing states
  db.prepare(`
    INSERT INTO alert_notification_state (alert_id, last_notified_value, last_notified_at)
    VALUES (?, ?, ?)
    ON CONFLICT(alert_id) DO UPDATE SET
      last_notified_value = excluded.last_notified_value,
      last_notified_at = excluded.last_notified_at
  `).run(alertId, auroraValue, now);
}

/**
 * Clean up old aurora history data (older than 24 hours)
 */
export function cleanupOldHistory() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const result = db.prepare(`
    DELETE FROM aurora_history
    WHERE recorded_at < ?
  `).run(twentyFourHoursAgo);

  if (result.changes > 0) {
    console.log(`[Cleanup] Deleted ${result.changes} old aurora history records`);
  }
}

