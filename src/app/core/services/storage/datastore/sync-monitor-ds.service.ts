import { Injectable } from '@angular/core';
import { DataStore } from '@aws-amplify/datastore';
import { Hub } from 'aws-amplify/utils';
import { AppUsageService } from '../../view/app-usage.service';

export enum STATE_SYNC_DS {
  NOINIT,
  UNSYNC,
  SYNC,
  READY,
}

/**
 * Service for monitoring DataStore synchronization.
 */
@Injectable({
  providedIn: 'root',
})
export class SyncMonitorDSService {
  public static state = STATE_SYNC_DS.NOINIT;
  public static networkStatus = false;
  private static isSubscribed = false; // Controla si ya hemos suscrito al Hub
  private static appUsageServiceInstance: AppUsageService | null = null;

  /**
   *
   * @param appUsageService
   */
  constructor(private appUsageService: AppUsageService) {
    SyncMonitorDSService.appUsageServiceInstance = appUsageService;
  }

  /**
   * Subscribes to DataStore events and logs synchronization activity.
   */
  static subscribeToSync(): void {
    if (this.isSubscribed) {
      return; // Ya estamos suscritos, no hacer nada
    }
    // Escuchar eventos de sincronización a través del Hub
    Hub.listen('datastore', (hubData) => {
      const { event, data } = hubData.payload;
      switch (event) {
        case 'networkStatus':
          if (this.isNetworkStatusData(data)) {
            this.networkStatus = data.active; // Actualiza el estado de la red
          }
          break;
        case 'outboxMutationEnqueued':
          this.state = STATE_SYNC_DS.UNSYNC; // Cambia el estado
          break;
        case 'outboxMutationProcessed':
          // Handle successful sync and cleanup AppUsage records
          if (this.isAppUsageEvent(data) && this.appUsageServiceInstance) {
            const recordId = data.element?.id;
            if (recordId) {
              void this.appUsageServiceInstance.cleanupSyncedRecord(recordId);
            }
          }
          break;
        case 'syncQueriesReady':
          this.state = STATE_SYNC_DS.SYNC; // Cambia el estado
          break;
        case 'ready':
          this.state = STATE_SYNC_DS.READY; // Cambia el estado
          break;

        default:
      }
    });

    Hub.listen('auth', (data) => {
      if (data.payload.event === 'signedOut') {
        void DataStore.clear();
      }
    });

    this.isSubscribed = true; // Marcamos como suscritos
  }

  /**
   * Get synchronize status
   * @returns {boolean} - True if data synchronized with cloud
   */
  synchronizedData(): boolean {
    return (
      SyncMonitorDSService.state == STATE_SYNC_DS.SYNC ||
      SyncMonitorDSService.state == STATE_SYNC_DS.READY
    );
  }

  /**
   * Waits for the animation to finish before allowing further processing.
   * @returns {Promise<void>} Resolves when the animation is finished.
   */
  static async waitForSyncDataStore(): Promise<void> {
    await DataStore.start();
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (SyncMonitorDSService.state === STATE_SYNC_DS.READY) {
          clearInterval(checkInterval); // Stop checking once animation ends
          resolve(); // Resolve the promise when animation finishes
        }
      }, 100); // Check every 100ms
    });
  }
  /**
   *
   * @param {unknown} data data
   * @returns {{ active: boolean }} retorn active boolean
   */
  private static isNetworkStatusData(
    data: unknown,
  ): data is { active: boolean } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'active' in data &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (data as any).active === 'boolean'
    );
  }

  /**
   * Type guard to check if the data is an AppUsageEvent mutation
   * @param {unknown} data - The data from the Hub event
   * @returns {boolean} True if data represents an AppUsageEvent mutation
   */
  private static isAppUsageEvent(data: unknown): data is {
    model: Function;
    element: { id: string };
  } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'model' in data &&
      'element' in data &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (data as any).model === 'function' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any).model.name === 'AppUsageEvent' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (data as any).element === 'object' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any).element !== null &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'id' in (data as any).element &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (data as any).element.id === 'string'
    );
  }
}
