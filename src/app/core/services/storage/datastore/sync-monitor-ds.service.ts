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
  /**
   * Subscribes to DataStore events and logs synchronization activity.
   */
  static state: STATE_SYNC_DS = STATE_SYNC_DS.NOINIT;
  static subscribeToSync(): void {
    // Escuchar eventos de sincronización a través del Hub

    Hub.listen('datastore', (hubData) => {
      const { event, data } = hubData.payload;

      switch (event) {
        case 'syncQueriesStarted':
          console.log('Sincronización iniciada');
          this.state = STATE_SYNC_DS.UNSYNC;
          break;

        case 'modelSynced':
          console.log(`${event} sincronizado:`, data);
          this.state = STATE_SYNC_DS.UNSYNC;
          break;

        case 'syncQueriesReady':
          console.log('Sincronización completa');
          this.state = STATE_SYNC_DS.SYNC;
          break;

        case 'ready':
          console.log('DataStore listo para usar');
          this.state = STATE_SYNC_DS.SYNC;
          break;

        default:
          console.log('Evento desconocido:', event, data);
      }
    });
    Hub.listen('auth', (data) => {
      if (data.payload.event === 'signedOut') {
        DataStore.clear()
          .then(() => {
            console.log('DataStore cleared successfully.');
          })
          .catch((error) => {
            console.error('Error clearing DataStore:', error);
          });
      }
    });
  }

  /**
   * Waits for the animation to finish before allowing further processing.
   * @returns {Promise<void>} Resolves when the animation is finished.
   */
  static async waitForSyncDataStore(): Promise<void> {
    // await DataStore.start();
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.state === STATE_SYNC_DS.SYNC) {
          clearInterval(checkInterval); // Stop checking once animation ends
          resolve(); // Resolve the promise when animation finishes
        }
      }, 100); // Check every 100ms
    });
  }

  static async currentNetworkStatus(): Promise<boolean> {
    return (await Network.getStatus()).connected;
  }
}
