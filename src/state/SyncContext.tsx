/**
 * B06 — SyncContext
 *
 * Ported from: src/app/core/services/storage/datastore/sync-monitor-ds.service.ts
 * Classification: Major adaptation
 *
 * Changes from original:
 *  - @Injectable removed → React Context + hook (portability-matrix §4.2)
 *  - Singleton static state → React state via useState (reactive UI observation)
 *  - BUG FIX (R-21 / §4.4): isAppUsageEvent compared data.model.name === 'AppUsageEvent'
 *    which Hermes minifies; now compares data.model === AppUsageEvent (class reference)
 *  - Polling 100ms → event-driven Promise (waitForSync uses Hub event callback, not setInterval)
 *  - AppUsageEvent cleanup delegated to AppUsageService (cleanupSyncedRecord)
 *  - NetInfo dependency handled by @aws-amplify/react-native + @react-native-community/netinfo
 *    (already installed/configured in B03)
 *  - Exposes: { state, networkStatus, synchronizedData(), waitForSync() }
 *
 * Portability matrix: "datastore/sync-monitor-ds.service.ts" → Major → B06
 * Risks: R-27 (no reactive state), R-04 (NetInfo), R-21 (Hermes type guard)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { DataStore } from '@aws-amplify/datastore';
import { Hub } from 'aws-amplify/utils';
import { AppUsageEvent } from '@/data/models';
import { cleanupSyncedRecord } from '@/data/view/app-usage';

// ─── State enum (mirrors original) ─────────────────────────────────────────

export enum STATE_SYNC_DS {
  NOINIT = 'NOINIT',
  UNSYNC = 'UNSYNC',
  SYNC = 'SYNC',
  READY = 'READY',
}

// ─── Type guards ─────────────────────────────────────────────────────────────

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
 * BUG FIX vs original (R-21 / §4.4):
 * Original: data.model.name === 'AppUsageEvent'
 *   → Hermes minifies Function.name; this SILENTLY BREAKS outbox cleanup.
 * Fix: compare data.model === AppUsageEvent (class reference, survives minification).
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

  // R-21 fix: compare by class reference (not Function.name)
  return d.model === AppUsageEvent;
}

// ─── Context shape ────────────────────────────────────────────────────────────

export interface SyncContextValue {
  /** Current DataStore sync state */
  state: STATE_SYNC_DS;
  /** Whether the device has network connectivity (from Hub networkStatus event) */
  networkStatus: boolean;
  /**
   * Returns true if DataStore has completed the initial sync (SYNC or READY).
   * Preserves the original synchronizedData() method signature.
   */
  synchronizedData: () => boolean;
  /**
   * Starts DataStore and returns a Promise that resolves when state reaches READY.
   * Event-driven replacement for the original polling loop (100ms setInterval).
   * Includes a timeout guard so it never hangs in offline mode (R-04).
   */
  waitForSync: (timeoutMs?: number) => Promise<void>;
}

const DEFAULT_WAIT_TIMEOUT_MS = 30_000;

// ─── Context ─────────────────────────────────────────────────────────────────

const SyncContext = createContext<SyncContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface SyncProviderProps {
  children: React.ReactNode;
}

export function SyncProvider({
  children,
}: SyncProviderProps): React.JSX.Element {
  const [state, setState] = useState<STATE_SYNC_DS>(STATE_SYNC_DS.NOINIT);
  const [networkStatus, setNetworkStatus] = useState<boolean>(false);

  // Listeners waiting for READY state (for waitForSync event-driven promises)
  const readyListenersRef = useRef<(() => void)[]>([]);

  // Notify all pending waitForSync callers when state becomes READY
  const notifyReadyListeners = useCallback(() => {
    const listeners = readyListenersRef.current;
    readyListenersRef.current = [];
    listeners.forEach((resolve) => resolve());
  }, []);

  useEffect(() => {
    const unsubscribeDatastore = Hub.listen('datastore', (hubData) => {
      const { event, data } = hubData.payload;

      switch (event) {
        case 'networkStatus':
          if (isNetworkStatusData(data)) {
            setNetworkStatus(data.active);
          }
          break;

        case 'outboxMutationEnqueued':
          setState(STATE_SYNC_DS.UNSYNC);
          break;

        case 'outboxMutationProcessed':
          // R-21 fix: use class reference comparison (not Function.name)
          if (isAppUsageEventMutation(data)) {
            const recordId = (data.element as { id: string }).id;
            if (recordId) {
              void cleanupSyncedRecord(recordId);
            }
          }
          break;

        case 'syncQueriesReady':
          setState(STATE_SYNC_DS.SYNC);
          break;

        case 'ready':
          setState(STATE_SYNC_DS.READY);
          notifyReadyListeners();
          break;
      }
    });

    const unsubscribeAuth = Hub.listen('auth', (hubData) => {
      if (hubData.payload.event === 'signedOut') {
        // Original parity: sync-monitor-ds.service.ts:72-75 also clears here, and
        // ProfileScreen.handleLogout clears explicitly. Both run concurrently, so
        // one of them can hit DataStore mid-teardown ("Cannot read property 'clear'
        // of undefined"). Keep BOTH calls (order unchanged) but never leave an
        // unhandled rejection behind.
        void (async () => {
          try {
            await DataStore.clear();
          } catch (clearErr) {
            console.warn(
              'DataStore.clear on signedOut failed (already cleared?):',
              clearErr,
            );
          }
        })();
        setState(STATE_SYNC_DS.NOINIT);
        setNetworkStatus(false);
      }
    });

    return () => {
      unsubscribeDatastore();
      unsubscribeAuth();
    };
  }, [notifyReadyListeners]);

  const synchronizedData = useCallback((): boolean => {
    return state === STATE_SYNC_DS.SYNC || state === STATE_SYNC_DS.READY;
  }, [state]);

  /**
   * Starts DataStore and waits until state reaches READY.
   * Event-driven replacement for the original 100ms polling loop.
   * Resolves on timeout so the app never hangs in offline mode (R-04).
   */
  const waitForSync = useCallback(
    (timeoutMs: number = DEFAULT_WAIT_TIMEOUT_MS): Promise<void> => {
      return new Promise<void>((resolve) => {
        // If already READY, resolve immediately
        if (state === STATE_SYNC_DS.READY) {
          resolve();
          return;
        }

        let settled = false;
        const wrappedResolve = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };

        // Register as a ready listener (notified when Hub fires 'ready')
        readyListenersRef.current.push(wrappedResolve);

        // Timeout guard (R-04: never hang in offline mode)
        const timer = setTimeout(() => {
          // Remove our listener from the list
          readyListenersRef.current = readyListenersRef.current.filter(
            (l) => l !== wrappedResolve,
          );
          wrappedResolve();
        }, timeoutMs);

        // Start DataStore (idempotent) — don't await here so we don't block the Promise
        void DataStore.start().catch((err) => {
          console.error(
            'DataStore.start() failed in waitForSync:',
            err,
            err instanceof Error ? err.stack : '',
          );
          clearTimeout(timer);
          wrappedResolve();
        });
      });
    },
    [state],
  );

  const value: SyncContextValue = {
    state,
    networkStatus,
    synchronizedData,
    waitForSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to consume SyncContext.
 * Must be used within a <SyncProvider>.
 */
export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSyncContext must be used within a <SyncProvider>');
  }
  return ctx;
}

export default SyncContext;
