import { Injectable } from '@angular/core';
import { DataStore } from '@aws-amplify/datastore';
import { Hub } from 'aws-amplify/utils';
import { Network } from '@capacitor/network';

export enum STATE_SYNC_DS {
  NOINIT,
  UNSYNC,
  SYNC,
}

/**
 * Service for monitoring DataStore synchronization.
 */
@Injectable({
  providedIn: 'root',
})
export class SyncMonitorDSService {
  static state: STATE_SYNC_DS = STATE_SYNC_DS.NOINIT;

  /**
   * Subscribes to DataStore events and logs synchronization activity.
   */
  static subscribeToSync(): void {
    // Escuchar eventos de sincronización a través del Hub

    Hub.listen('datastore', (hubData) => {
      const { event } = hubData.payload;

      switch (event) {
        case 'syncQueriesStarted':
          this.state = STATE_SYNC_DS.UNSYNC;
          break;

        case 'modelSynced':
          this.state = STATE_SYNC_DS.UNSYNC;
          break;

        case 'ready':
          this.state = STATE_SYNC_DS.SYNC;
          break;

        default:
      }
    });
    Hub.listen('auth', (data) => {
      if (data.payload.event === 'signedOut') {
        void DataStore.clear();
      }
    });
  }

  /**
   * Waits for the animation to finish before allowing further processing.
   * @returns {Promise<void>} Resolves when the animation is finished.
   */
  static async waitForSyncDataStore(): Promise<void> {
    await DataStore.start();
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.state === STATE_SYNC_DS.SYNC) {
          clearInterval(checkInterval); // Stop checking once animation ends
          resolve(); // Resolve the promise when animation finishes
        }
      }, 100); // Check every 100ms
    });
  }

  /**
   * Subscribes to DataStore events and logs synchronization activity.
   * @returns {Promise<boolean>} StateNework, true is conected
   */
  static async currentNetworkStatus(): Promise<boolean> {
    return (await Network.getStatus()).connected;
  }
}
