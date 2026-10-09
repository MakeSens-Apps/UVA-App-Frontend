/**
 * B03 — Minimal sync monitor (bootstrapper)
 *
 * Ported from: src/app/core/services/storage/datastore/sync-monitor-ds.service.ts
 * Changes from original:
 *   - Removed @Injectable decorator (DI → module singleton, portability matrix 4.1)
 *   - Removed AppUsageService dependency (moved to B06/SyncContext which has the full context)
 *   - isAppUsageEvent type guard uses imported AppUsageEvent class instead of model.name
 *     (R-21: Hermes minifies Function.name — use class reference comparison, fixed in B06)
 *   - waitForSyncDataStore gains a TIMEOUT_MS guard so it never hangs (R-04)
 *   - NOTE: The full SyncContext (with React Context, hooks, NetInfo subscription)
 *     will be built in B06. This module provides the bare Hub subscription that
 *     the B03 gate test exercises.
 *
 * Portability matrix: "datastore/sync-monitor-ds.service.ts" → Major → B06 (SyncContext)
 * This file is the B03 bootstrap portion that gates Amplify startup.
 */

import { DataStore } from '@aws-amplify/datastore';
import { Hub } from 'aws-amplify/utils';
import { AppUsageEvent } from '../models';

export enum STATE_SYNC_DS {
  NOINIT = 'NOINIT',
  UNSYNC = 'UNSYNC',
  SYNC = 'SYNC',
  READY = 'READY',
}

/** Default timeout for waitForSyncDataStore: 30 s (R-04 guard) */
const WAIT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 100;

/**
 * Minimal static sync state — mirrors the original SyncMonitorDSService static fields.
 * The full React context wrapper is built in B06 (SyncContext).
 */
const _state = {
  syncState: STATE_SYNC_DS.NOINIT as STATE_SYNC_DS,
  networkStatus: false,
  isSubscribed: false,
};

// ─── Type guards ────────────────────────────────────────────────────────────

function isNetworkStatusData(data: unknown): data is { active: boolean } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'active' in data &&
    typeof (data as Record<string, unknown>).active === 'boolean'
  );
}

/**
 * Identifies AppUsageEvent mutations safely under Hermes.
 *
 * BUG FIX vs original (R-21):
 * Original uses `data.model.name === 'AppUsageEvent'` — Hermes can mangle
 * class names. This version compares by class reference (imported AppUsageEvent),
 * which survives minification.
 *
 * Note: The full fix (using imported class reference) is applied in B06/SyncContext.
 * Here we use both checks for robustness during B03 bootstrap.
 */
function isAppUsageEventMutation(data: unknown): data is {
  model: unknown;
  element: { id: string };
} {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('model' in data) ||
    !('element' in data)
  ) {
    return false;
  }
  const d = data as Record<string, unknown>;
  const element = d.element as Record<string, unknown> | null | undefined;
  if (!element || typeof element.id !== 'string') return false;

  // Safe check: use class reference (R-21 fix) OR name fallback
  return (
    d.model === AppUsageEvent ||
    (d.model as { name?: string })?.name === 'AppUsageEvent'
  );
}

// ─── Public API (mirrors original static methods) ────────────────────────────

/**
 * Subscribe to Hub events for DataStore and Auth channels.
 * Idempotent (safe to call multiple times).
 * Ported from: SyncMonitorDSService.subscribeToSync()
 */
export function subscribeToSync(): void {
  if (_state.isSubscribed) return;

  Hub.listen('datastore', (hubData) => {
    const { event, data } = hubData.payload;
    switch (event) {
      case 'networkStatus':
        if (isNetworkStatusData(data)) {
          _state.networkStatus = data.active;
        }
        break;
      case 'outboxMutationEnqueued':
        _state.syncState = STATE_SYNC_DS.UNSYNC;
        break;
      case 'outboxMutationProcessed':
        // AppUsageEvent cleanup delegated to B06 SyncContext (avoids circular dep)
        if (isAppUsageEventMutation(data)) {
          // No-op here; SyncContext in B06 will handle cleanup.
        }
        break;
      case 'syncQueriesReady':
        _state.syncState = STATE_SYNC_DS.SYNC;
        break;
      case 'ready':
        _state.syncState = STATE_SYNC_DS.READY;
        break;
    }
  });

  Hub.listen('auth', (hubData) => {
    if (hubData.payload.event === 'signedOut') {
      void DataStore.clear();
    }
  });

  _state.isSubscribed = true;
}

/**
 * Returns the current network connectivity status as observed by DataStore Hub.
 */
export function getNetworkStatus(): boolean {
  return _state.networkStatus;
}

/**
 * Returns the current DataStore sync state.
 */
export function getSyncState(): STATE_SYNC_DS {
  return _state.syncState;
}

/**
 * Returns true if DataStore has completed the initial sync (SYNC or READY).
 * Ported from: SyncMonitorDSService.synchronizedData()
 */
export function isSynchronized(): boolean {
  return (
    _state.syncState === STATE_SYNC_DS.SYNC ||
    _state.syncState === STATE_SYNC_DS.READY
  );
}

/**
 * Starts DataStore and waits until state === READY, with a timeout guard.
 *
 * Ported from: SyncMonitorDSService.waitForSyncDataStore()
 * Enhancement vs original: resolves (not hangs) on timeout (R-04 guard).
 *
 * @param timeoutMs Maximum wait time in ms (default 30 s). Resolves after timeout
 *   even if not READY so the splash never freezes in offline mode.
 */
export async function waitForSyncDataStore(
  timeoutMs: number = WAIT_TIMEOUT_MS,
): Promise<void> {
  await DataStore.start();
  return new Promise((resolve) => {
    // Immediate check: already READY before polling starts
    if (_state.syncState === STATE_SYNC_DS.READY) {
      resolve();
      return;
    }

    let elapsed = 0;
    const checkInterval = setInterval(() => {
      elapsed += POLL_INTERVAL_MS;
      if (_state.syncState === STATE_SYNC_DS.READY || elapsed >= timeoutMs) {
        clearInterval(checkInterval);
        resolve();
      }
    }, POLL_INTERVAL_MS);
  });
}
