import cron from 'node-cron';
import { checkAllPrices } from './priceChecker';

export function startPriceCheckScheduler() {
  cron.schedule('0 */12 * * *', async () => {
    console.log('[Scheduler] Running scheduled price check...');
    try {
      await checkAllPrices();
    } catch (error) {
      console.error('[Scheduler] Error during scheduled price check:', error);
    }
  });

  console.log('[Scheduler] Price checker scheduled to run every 12 hours');
}
