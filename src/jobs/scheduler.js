/**
 * Background job scheduler
 * Runs alert checks every 5 minutes
 */

import cron from 'node-cron';
import { checkAllAlerts, cleanupOldHistory } from '../services/alert.js';

/**
 * Start the background job scheduler
 */
export function startScheduler() {
  console.log('[Scheduler] Starting background job scheduler...');
  
  // Run alert check every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Scheduler] Running scheduled alert check...');
    await checkAllAlerts();
  });

  // Clean up old history data every hour
  cron.schedule('0 * * * *', () => {
    console.log('[Scheduler] Running history cleanup...');
    cleanupOldHistory();
  });

  // Also run immediately on startup (optional, for testing)
  console.log('[Scheduler] Running initial alert check...');
  checkAllAlerts().catch(err => {
    console.error('[Scheduler] Error in initial alert check:', err);
  });

  // Run initial cleanup
  cleanupOldHistory();

  console.log('[Scheduler] Scheduler started. Alert checks will run every 5 minutes, cleanup every hour.');
}

