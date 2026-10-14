/**
 * #79 — pending-sync tracker
 *
 * The tracker counts the person's changes still in the DataStore outbox from
 * the Hub events the sync engine emits, without the AppUsageEvent telemetry,
 * persists the count and clears it on sign-out.
 */

type HubCallback = (data: {
  payload: { event: string; data?: unknown };
}) => void;
const mockHubListeners: Record<string, HubCallback[]> = {
  datastore: [],
  auth: [],
};

jest.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: jest.fn((channel: string, callback: HubCallback) => {
      if (!mockHubListeners[channel]) mockHubListeners[channel] = [];
      mockHubListeners[channel].push(callback);
      return () => {
        mockHubListeners[channel] = mockHubListeners[channel].filter(
          (c) => c !== callback,
        );
      };
    }),
  },
}));

jest.mock('../data/models', () => ({
  Measurement: class Measurement {},
  AppUsageEvent: class AppUsageEvent {},
}));

// eslint-disable-next-line import/first
import {
  createPendingSyncTracker,
  PENDING_SYNC_STORAGE_KEY,
  type PendingSyncTracker,
} from '../data/amplify-bootstrap/pending-sync-tracker';

class Measurement {}
class UserProgress {}
class Telemetry {}

function makeStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: jest.fn(async (key: string) => data[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      data[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete data[key];
    }),
  };
}

function datastore(event: string, data?: unknown): void {
  mockHubListeners.datastore.forEach((cb) => cb({ payload: { event, data } }));
}

function auth(event: string): void {
  mockHubListeners.auth.forEach((cb) => cb({ payload: { event } }));
}

const enqueued = (model: unknown) =>
  datastore('outboxMutationEnqueued', { model, element: { id: 'x' } });
const processed = (model: unknown) =>
  datastore('outboxMutationProcessed', { model, element: { id: 'x' } });
const outboxStatus = (isEmpty: boolean) =>
  datastore('outboxStatus', { isEmpty });

/** Lets the chained AsyncStorage writes settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function startTracker(
  storage = makeStorage({ [PENDING_SYNC_STORAGE_KEY]: '0' }),
): Promise<{ tracker: PendingSyncTracker; storage: typeof storage }> {
  const tracker = createPendingSyncTracker({
    storage,
    isIgnoredModel: (model) => model === Telemetry,
  });
  tracker.start();
  await tracker.ready();
  return { tracker, storage };
}

beforeEach(() => {
  mockHubListeners.datastore = [];
  mockHubListeners.auth = [];
});

describe('pending-sync tracker — counting', () => {
  it('counts an enqueued measurement and clears it when it is uploaded', async () => {
    const { tracker } = await startTracker();
    enqueued(Measurement);
    expect(tracker.getCount()).toBe(1);
    processed(Measurement);
    expect(tracker.getCount()).toBe(0);
  });

  it('counts every model the person changes (progress, UVA, profile…)', async () => {
    const { tracker } = await startTracker();
    enqueued(Measurement);
    enqueued(UserProgress);
    expect(tracker.getCount()).toBe(2);
  });

  it('ignores the usage telemetry (AppUsageEvent)', async () => {
    const { tracker } = await startTracker();
    enqueued(Telemetry);
    outboxStatus(false);
    expect(tracker.getCount()).toBe(0);
    enqueued(Measurement);
    processed(Telemetry);
    expect(tracker.getCount()).toBe(1);
  });

  it('never goes below zero', async () => {
    const { tracker } = await startTracker();
    processed(Measurement);
    expect(tracker.getCount()).toBe(0);
  });

  it('resets to zero when the outbox reports it is empty (merged or dropped mutations)', async () => {
    const { tracker } = await startTracker();
    // Create + update of the same record offline: the outbox merges them and
    // only one processed event arrives.
    enqueued(Measurement);
    enqueued(Measurement);
    processed(Measurement);
    expect(tracker.getCount()).toBe(1);
    outboxStatus(true);
    expect(tracker.getCount()).toBe(0);
  });

  it('keeps pending while offline: a non-empty outbox status does not clear it', async () => {
    const { tracker } = await startTracker();
    enqueued(Measurement);
    outboxStatus(false);
    expect(tracker.getCount()).toBe(1);
  });

  it('notifies subscribers on every change and stops after unsubscribe', async () => {
    const { tracker } = await startTracker();
    const listener = jest.fn();
    const unsubscribe = tracker.subscribe(listener);
    enqueued(Measurement);
    processed(Measurement);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    enqueued(Measurement);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('start() is idempotent', async () => {
    const { tracker } = await startTracker();
    tracker.start();
    enqueued(Measurement);
    expect(tracker.getCount()).toBe(1);
  });
});

describe('pending-sync tracker — persistence', () => {
  it('persists the count after each change', async () => {
    const { storage } = await startTracker();
    enqueued(Measurement);
    enqueued(Measurement);
    await flush();
    expect(storage.data[PENDING_SYNC_STORAGE_KEY]).toBe('2');
    processed(Measurement);
    await flush();
    expect(storage.data[PENDING_SYNC_STORAGE_KEY]).toBe('1');
  });

  it('restores the persisted count after an app restart', async () => {
    const { tracker } = await startTracker(
      makeStorage({ [PENDING_SYNC_STORAGE_KEY]: '3' }),
    );
    expect(tracker.getCount()).toBe(3);
  });

  it('a restored count clears when the outbox turns out to be empty at start', async () => {
    const { tracker } = await startTracker(
      makeStorage({ [PENDING_SYNC_STORAGE_KEY]: '2' }),
    );
    outboxStatus(true);
    expect(tracker.getCount()).toBe(0);
  });

  it('applies events that arrive before the persisted count is loaded', async () => {
    const storage = makeStorage({ [PENDING_SYNC_STORAGE_KEY]: '2' });
    const tracker = createPendingSyncTracker({
      storage,
      isIgnoredModel: (model) => model === Telemetry,
    });
    tracker.start();
    enqueued(Measurement); // before hydration finishes
    await tracker.ready();
    expect(tracker.getCount()).toBe(3);
  });

  it('notifies subscribers once the persisted count is loaded', async () => {
    const storage = makeStorage({ [PENDING_SYNC_STORAGE_KEY]: '1' });
    const tracker = createPendingSyncTracker({
      storage,
      isIgnoredModel: () => false,
    });
    const listener = jest.fn();
    tracker.subscribe(listener);
    tracker.start();
    await tracker.ready();
    expect(listener).toHaveBeenCalled();
    expect(tracker.getCount()).toBe(1);
  });

  it('without a persisted count (first run after updating), a non-empty outbox counts as pending until it drains', async () => {
    const { tracker } = await startTracker(makeStorage());
    outboxStatus(false);
    expect(tracker.getCount()).toBe(1);
    outboxStatus(true);
    expect(tracker.getCount()).toBe(0);
    // Once the baseline is known, telemetry alone no longer counts.
    outboxStatus(false);
    expect(tracker.getCount()).toBe(0);
  });

  it('treats a storage read failure as an unknown baseline', async () => {
    const storage = makeStorage();
    storage.getItem.mockRejectedValueOnce(new Error('disk'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { tracker } = await startTracker(storage);
    outboxStatus(false);
    expect(tracker.getCount()).toBe(1);
    warn.mockRestore();
  });
});

describe('pending-sync tracker — sign-out', () => {
  it('clears the count and removes the persisted value on signedOut', async () => {
    const { tracker, storage } = await startTracker();
    enqueued(Measurement);
    await flush();
    expect(storage.data[PENDING_SYNC_STORAGE_KEY]).toBe('1');
    const listener = jest.fn();
    tracker.subscribe(listener);
    auth('signedOut');
    await flush();
    expect(tracker.getCount()).toBe(0);
    expect(storage.data[PENDING_SYNC_STORAGE_KEY]).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores other auth events', async () => {
    const { tracker } = await startTracker();
    enqueued(Measurement);
    auth('signedIn');
    expect(tracker.getCount()).toBe(1);
  });
});
