/**
 * #79 — Pending-sync tracker
 *
 * Counts the changes the person made that are still in the DataStore outbox
 * (measurements, streak/achievement progress, UVA and profile data), so the UI
 * can show "Con sincronizaciones pendientes" only while something is really
 * waiting to be uploaded.
 *
 * Why not STATE_SYNC_DS.UNSYNC: that state flips on ANY enqueued mutation —
 * including the AppUsageEvent telemetry written on every navigation — and only
 * leaves UNSYNC when DataStore starts again, so the warning stuck until the app
 * restarted (#79). UNSYNC and synchronizedData() are kept as they are.
 *
 * How it counts (Hub 'datastore' events emitted by the sync engine):
 *  - outboxMutationEnqueued (not telemetry) → +1
 *  - outboxMutationProcessed (not telemetry) → −1 (never below 0)
 *  - outboxStatus { isEmpty: true }          → 0. The sync engine emits it at
 *    start and when the outbox drains. It also clears the drift of mutations
 *    the outbox merges (create + update offline: two enqueued, one processed).
 *  - auth signedOut                          → 0 and the persisted value is removed
 *    (DataStore.clear() empties the outbox on sign-out).
 *
 * The count is persisted in AsyncStorage so it survives an app restart. When
 * there is no persisted value (right after an app update with items already in
 * the outbox, or after a sign-out until the outbox is seen empty) the baseline
 * is unknown: a non-empty outbox is reported as pending until it drains. The
 * first outboxStatus { isEmpty: true } saves the known baseline (0).
 *
 * Known limits (both clear on the next drain of the outbox or a restart):
 *  - A mutation that fails for good is dropped by DataStore without any event,
 *    so it stays counted until the next drain.
 *  - A save that lands between the engine's dequeue and its late
 *    outboxStatus { isEmpty: true } is reset to 0 while still queued; it is
 *    uploaded right away online, so it only shows if the network drops then.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Hub } from 'aws-amplify/utils';
import { AppUsageEvent } from '../models';

export const PENDING_SYNC_STORAGE_KEY = 'pendingSyncCount';

type Listener = () => void;

interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

interface TrackerDeps {
  storage: KeyValueStorage;
  /** Returns true for models that must not count as pending (telemetry). */
  isIgnoredModel: (model: unknown) => boolean;
}

export interface PendingSyncTracker {
  /** Subscribes to Hub and loads the persisted count. Idempotent. */
  start: () => void;
  /** Number of the person's changes still waiting to be uploaded. */
  getCount: () => number;
  /** Notifies on every count change. Returns the unsubscribe function. */
  subscribe: (listener: Listener) => () => void;
  /** Resolves once the persisted count was loaded (or failed to load). */
  ready: () => Promise<void>;
}

function hasModel(data: unknown): data is { model: unknown } {
  return typeof data === 'object' && data !== null && 'model' in data;
}

function isOutboxStatusData(data: unknown): data is { isEmpty: boolean } {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).isEmpty === 'boolean'
  );
}

export function createPendingSyncTracker(
  deps: TrackerDeps,
): PendingSyncTracker {
  let count = 0;
  let started = false;
  let hydrated = false;
  // No persisted value: we cannot tell the person's changes from telemetry
  // already in the outbox, so a non-empty outbox counts as pending.
  let unknownBaseline = false;
  // Hub events that arrive before the persisted count is loaded.
  const queued: (() => void)[] = [];
  const listeners = new Set<Listener>();
  let writeChain: Promise<void> = Promise.resolve();
  let readyPromise: Promise<void> = Promise.resolve();

  function persist(task: () => Promise<void>): void {
    writeChain = writeChain.then(task).catch((err: unknown) => {
      console.warn('pending-sync-tracker: could not persist the count', err);
    });
  }

  function setCount(next: number): void {
    const value = Math.max(0, next);
    if (value === count) return;
    count = value;
    persist(() =>
      deps.storage.setItem(PENDING_SYNC_STORAGE_KEY, String(value)),
    );
    listeners.forEach((listener) => listener());
  }

  function run(apply: () => void): void {
    if (hydrated) {
      apply();
    } else {
      queued.push(apply);
    }
  }

  function onDatastoreEvent(event: string, data: unknown): void {
    switch (event) {
      case 'outboxMutationEnqueued':
        if (hasModel(data) && !deps.isIgnoredModel(data.model)) {
          run(() => setCount(count + 1));
        }
        break;
      case 'outboxMutationProcessed':
        if (hasModel(data) && !deps.isIgnoredModel(data.model)) {
          run(() => setCount(count - 1));
        }
        break;
      case 'outboxStatus':
        if (isOutboxStatusData(data)) {
          const { isEmpty } = data;
          run(() => {
            if (isEmpty) {
              if (unknownBaseline && count === 0) {
                // setCount(0) would not write: save the now-known baseline so
                // the next restart does not count telemetry as pending.
                persist(() =>
                  deps.storage.setItem(PENDING_SYNC_STORAGE_KEY, '0'),
                );
              }
              unknownBaseline = false;
              setCount(0);
            } else if (unknownBaseline && count === 0) {
              setCount(1);
            }
          });
        }
        break;
    }
  }

  function onSignedOut(): void {
    run(() => {
      unknownBaseline = false;
      const changed = count !== 0;
      count = 0;
      persist(() => deps.storage.removeItem(PENDING_SYNC_STORAGE_KEY));
      if (changed) listeners.forEach((listener) => listener());
    });
  }

  async function hydrate(): Promise<void> {
    try {
      const stored = await deps.storage.getItem(PENDING_SYNC_STORAGE_KEY);
      const parsed = stored === null ? NaN : Number.parseInt(stored, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        count = parsed;
      } else if (stored === null) {
        unknownBaseline = true;
      }
    } catch (err) {
      console.warn('pending-sync-tracker: could not load the count', err);
      unknownBaseline = true;
    }
    hydrated = true;
    queued.splice(0).forEach((apply) => apply());
    // The loaded value bypasses setCount, so notify it once.
    listeners.forEach((listener) => listener());
  }

  return {
    start() {
      if (started) return;
      started = true;
      Hub.listen('datastore', (hubData) => {
        const { event, data } = hubData.payload;
        onDatastoreEvent(event, data);
      });
      Hub.listen('auth', (hubData) => {
        if (hubData.payload.event === 'signedOut') onSignedOut();
      });
      readyPromise = hydrate();
    },
    getCount: () => count,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ready: () => readyPromise,
  };
}

/** App-wide tracker. Started from subscribeToSync() before DataStore starts. */
export const pendingSyncTracker = createPendingSyncTracker({
  storage: AsyncStorage,
  // Class reference, not Function.name (Hermes minifies names, R-21).
  isIgnoredModel: (model) => model === AppUsageEvent,
});
