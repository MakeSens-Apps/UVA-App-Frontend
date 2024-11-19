import { DataStore } from '@aws-amplify/datastore';

/**
 * Service for monitoring DataStore synchronization.
 */
export class SyncMonitorDSService {
  /**
   * Subscribes to DataStore events and logs synchronization activity.
   */
  static monitorSync(): void {
    DataStore.observe().subscribe({
      next: (event) => {
        console.log(`Synchronization event: ${event.model}, ${event.opType}`);
      },
      error: (err) => {
        console.error('Synchronization error', err);
      },
    });
  }
}
