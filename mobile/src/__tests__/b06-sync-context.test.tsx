/**
 * B06 Gate — Jest tests: SyncContext
 *
 * Gate requirements (from plan.md §B06):
 *  1. SyncContext maps Hub events to states correctly
 *  2. waitForSync resolves when state reaches READY
 *  3. type guard recognizes AppUsageEvent by class reference (R-21 — Hermes safe)
 *  4. waitForSync resolves on timeout if READY never fires (R-04 guard)
 *
 * Native module mocks are in jest.setup.js.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

// ─── Hub mock ──────────────────────────────────────────────────────────────────
type HubCallback = (data: { payload: { event: string; data?: unknown } }) => void;
const mockHubListeners: Record<string, HubCallback[]> = { datastore: [], auth: [] };

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

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    configure: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    clear: jest.fn(),
    query: jest.fn(() => Promise.resolve(null)),
    delete: jest.fn(() => Promise.resolve()),
  },
  syncExpression: jest.fn((_model: unknown, fn: unknown) => ({ model: _model, fn })),
  initSchema: jest.fn(() => ({
    RACIMO: jest.fn(),
    Measurement: jest.fn(),
    UserProgress: jest.fn(),
    GamificationEvent: jest.fn(),
    AppUsageEvent: jest.fn(),
    User: jest.fn(),
    UVA: jest.fn(),
  })),
}));

/**
 * The AppUsageEvent class MUST be created inside the jest.mock factory, NOT outside.
 * jest.mock() is hoisted above variable declarations, so any variable defined
 * outside the factory would be `undefined` when the factory runs.
 * We use jest.requireMock() AFTER the mocks are set up to get the actual class reference.
 */
jest.mock('../data/models', () => {
  // Create the class INSIDE the factory so it's defined when the factory runs
  class AppUsageEventMock {
    id: string;
    constructor(props: Record<string, unknown>) {
      this.id = (props.id as string) || '';
    }
  }
  return {
    RACIMO: jest.fn(),
    Measurement: jest.fn(),
    UserProgress: jest.fn(),
    GamificationEvent: jest.fn(),
    AppUsageEvent: AppUsageEventMock,
    User: jest.fn(),
    UVA: jest.fn(),
  };
});

jest.mock('../data/view/app-usage', () => ({
  cleanupSyncedRecord: jest.fn(() => Promise.resolve()),
  appUsageSyncExpression: { model: jest.fn(), fn: jest.fn() },
}));

// Static imports after mocks
// eslint-disable-next-line import/first
import { SyncProvider, useSyncContext, STATE_SYNC_DS } from '../state/SyncContext';
// eslint-disable-next-line import/first
import { DataStore } from '@aws-amplify/datastore';
// eslint-disable-next-line import/first
import { cleanupSyncedRecord } from '../data/view/app-usage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fireDatastoreEvent(event: string, data?: unknown): void {
  mockHubListeners.datastore.forEach((cb) => cb({ payload: { event, data } }));
}

function fireAuthEvent(event: string): void {
  mockHubListeners.auth.forEach((cb) => cb({ payload: { event } }));
}

async function renderSyncHook() {
  return renderHook(() => useSyncContext(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <SyncProvider>{children}</SyncProvider>
    ),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('B06 — SyncContext', () => {
  // Get the AppUsageEvent class reference from the mock (set up AFTER jest.mock runs)
  let AppUsageEventClass: new (props: Record<string, unknown>) => { id: string };

  beforeAll(() => {
    // Use jest.requireMock to get the mocked module's AppUsageEvent class
    // This is the SAME class reference that SyncContext.tsx gets when it imports from @/data/models
    const models = jest.requireMock('../data/models') as {
      AppUsageEvent: new (props: Record<string, unknown>) => { id: string };
    };
    AppUsageEventClass = models.AppUsageEvent;
  });

  beforeEach(() => {
    // Reset listener arrays so each test starts with a clean slate
    mockHubListeners.datastore = [];
    mockHubListeners.auth = [];
    jest.clearAllMocks();
  });

  it('exposes initial NOINIT state and networkStatus=false', async () => {
    const { result } = await renderSyncHook();
    expect(result.current.state).toBe(STATE_SYNC_DS.NOINIT);
    expect(result.current.networkStatus).toBe(false);
  });

  it('networkStatus event active:true → networkStatus becomes true', async () => {
    const { result } = await renderSyncHook();

    await act(async () => {
      fireDatastoreEvent('networkStatus', { active: true });
    });

    expect(result.current.networkStatus).toBe(true);
  });

  it('networkStatus event active:false → networkStatus becomes false', async () => {
    const { result } = await renderSyncHook();

    await act(async () => {
      fireDatastoreEvent('networkStatus', { active: true });
    });
    await act(async () => {
      fireDatastoreEvent('networkStatus', { active: false });
    });

    expect(result.current.networkStatus).toBe(false);
  });

  it('outboxMutationEnqueued → state transitions to UNSYNC', async () => {
    const { result } = await renderSyncHook();

    await act(async () => {
      fireDatastoreEvent('outboxMutationEnqueued', {});
    });

    expect(result.current.state).toBe(STATE_SYNC_DS.UNSYNC);
  });

  it('syncQueriesReady → state transitions to SYNC and synchronizedData() returns true', async () => {
    const { result } = await renderSyncHook();

    await act(async () => {
      fireDatastoreEvent('syncQueriesReady', {});
    });

    expect(result.current.state).toBe(STATE_SYNC_DS.SYNC);
    expect(result.current.synchronizedData()).toBe(true);
  });

  it('ready event → state transitions to READY and synchronizedData() returns true', async () => {
    const { result } = await renderSyncHook();

    await act(async () => {
      fireDatastoreEvent('ready', {});
    });

    expect(result.current.state).toBe(STATE_SYNC_DS.READY);
    expect(result.current.synchronizedData()).toBe(true);
  });

  it('waitForSync resolves when Hub fires ready event', async () => {
    const { result } = await renderSyncHook();

    let resolved = false;

    await act(async () => {
      const waitPromise = result.current.waitForSync(5000);
      // Fire ready to resolve the promise
      fireDatastoreEvent('ready', {});
      await waitPromise;
      resolved = true;
    });

    expect(resolved).toBe(true);
    expect(DataStore.start).toHaveBeenCalled();
  });

  it('waitForSync resolves on timeout if READY never fires (R-04 guard)', async () => {
    const { result } = await renderSyncHook();

    // Very short timeout — must resolve, not hang
    await act(async () => {
      await expect(result.current.waitForSync(150)).resolves.toBeUndefined();
    });
  }, 3000);

  it('waitForSync resolves immediately if state is already READY', async () => {
    const { result } = await renderSyncHook();

    // Advance to READY first
    await act(async () => {
      fireDatastoreEvent('ready', {});
    });

    // Now waitForSync should resolve immediately
    await act(async () => {
      await expect(result.current.waitForSync(5000)).resolves.toBeUndefined();
    });
  });

  it('signedOut auth event calls DataStore.clear() and resets state to NOINIT', async () => {
    const { result } = await renderSyncHook();

    // Advance to SYNC
    await act(async () => {
      fireDatastoreEvent('syncQueriesReady', {});
    });
    expect(result.current.state).toBe(STATE_SYNC_DS.SYNC);

    // Sign out
    await act(async () => {
      fireAuthEvent('signedOut');
    });

    expect(DataStore.clear).toHaveBeenCalled();
    expect(result.current.state).toBe(STATE_SYNC_DS.NOINIT);
  });

  // ── R-21 Type guard tests ─────────────────────────────────────────────────

  it('type guard (R-21): recognizes AppUsageEvent by class reference (not Function.name)', async () => {
    const { result } = await renderSyncHook();

    // Use the EXACT same class reference that SyncContext.tsx imported (via requireMock)
    const mockData = {
      model: AppUsageEventClass,
      element: { id: 'test-record-123' },
    };

    await act(async () => {
      fireDatastoreEvent('outboxMutationProcessed', mockData);
    });

    expect(cleanupSyncedRecord).toHaveBeenCalledWith('test-record-123');
    void result;
  });

  it('type guard (R-21): does NOT call cleanup for non-AppUsageEvent mutations', async () => {
    const { result } = await renderSyncHook();

    const mockData = {
      model: class SomeOtherModel {},
      element: { id: 'other-record-456' },
    };

    await act(async () => {
      fireDatastoreEvent('outboxMutationProcessed', mockData);
    });

    expect(cleanupSyncedRecord).not.toHaveBeenCalled();
    void result;
  });

  it('type guard (R-21): rejects class with different reference (Hermes minification scenario)', async () => {
    const { result } = await renderSyncHook();

    // Different class reference — simulates Hermes mangling the name
    class DifferentClassReference {}
    const mockData = {
      model: DifferentClassReference,
      element: { id: 'fake-record-789' },
    };

    await act(async () => {
      fireDatastoreEvent('outboxMutationProcessed', mockData);
    });

    expect(cleanupSyncedRecord).not.toHaveBeenCalled();
    void result;
  });

  it('Hub listeners are cleaned up on unmount (no memory leak)', async () => {
    const { unmount } = await renderSyncHook();

    // Hub.listen should have been called (2 listeners: datastore + auth)
    const listenersBefore =
      mockHubListeners.datastore.length + mockHubListeners.auth.length;
    expect(listenersBefore).toBeGreaterThan(0);

    await act(async () => {
      unmount();
    });

    const listenersAfter =
      mockHubListeners.datastore.length + mockHubListeners.auth.length;
    expect(listenersAfter).toBeLessThan(listenersBefore);
  });
});
