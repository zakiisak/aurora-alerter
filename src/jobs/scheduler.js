/**
 * Background job scheduler
 * Runs alert checks every 5 minutes
 */

import cron from 'node-cron';
import { checkAllAlerts } from '../services/alert.js';

/**
 * Start the background job scheduler
 */
export function startScheduler() {
  console.log('[Scheduler] Starting background job scheduler...');
  
  // Run every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Scheduler] Running scheduled alert check...');
    await checkAllAlerts();
  });

  // Also run immediately on startup (optional, for testing)
  console.log('[Scheduler] Running initial alert check...');
  checkAllAlerts().catch(err => {
    console.error('[Scheduler] Error in initial alert check:', err);
  });

  console.log('[Scheduler] Scheduler started. Alert checks will run every 5 minutes.');
}

