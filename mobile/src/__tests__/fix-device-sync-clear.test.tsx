/**
 * Device bug B3 (Redmi Note 10S, Android 13) — lado SyncContext.
 *
 * "TypeError: Cannot read property 'clear' of undefined" al cerrar sesión:
 * ProfileScreen.handleLogout llama DataStore.clear() y, en paralelo, el listener
 * Hub 'signedOut' de SyncContext llama otra vez DataStore.clear(). La segunda
 * llamada encuentra DataStore a medio desmontar y rechaza.
 *
 * Paridad con el original (sync-monitor-ds.service.ts:72-75 + profile.page.ts:237):
 * se mantienen AMBAS llamadas y el mismo orden; sólo se garantiza que el rechazo
 * queda manejado (console.warn) y que el resto del handler sigue ejecutándose.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

// ─── Hub mock ─────────────────────────────────────────────────────────────────

type HubCallback = (data: { payload: { event: string; data?: unknown } }) => void;
const mockHubListeners: Record<string, HubCallback[]> = { datastore: [], auth: [] };

jest.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: jest.fn((channel: string, callback: HubCallback) => {
      if (!mockHubListeners[channel]) mockHubListeners[channel] = [];
      mockHubListeners[channel].push(callback);
      return () => {
        mockHubListeners[channel] = mockHubListeners[channel].filter((c) => c !== callback);
      };
    }),
  },
}));

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    configure: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    query: jest.fn(() => Promise.resolve(null)),
    delete: jest.fn(() => Promise.resolve()),
  },
  syncExpression: jest.fn((_model: unknown, fn: unknown) => ({ model: _model, fn })),
  initSchema: jest.fn(() => ({})),
}));

jest.mock('../data/models', () => {
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

// eslint-disable-next-line import/first
import { SyncProvider, useSyncContext, STATE_SYNC_DS } from '../state/SyncContext';
// eslint-disable-next-line import/first
import { DataStore } from '@aws-amplify/datastore';

function fireAuthEvent(event: string): void {
  mockHubListeners.auth.forEach((cb) => cb({ payload: { event } }));
}

async function renderSyncHook() {
  return renderHook(() => useSyncContext(), {
    wrapper: ({ children }: { children: React.ReactNode }) => <SyncProvider>{children}</SyncProvider>,
  });
}

describe('B3 — Hub signedOut: un rechazo de DataStore.clear no propaga', () => {
  let warnSpy: jest.SpyInstance;
  let unhandled: unknown[];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    jest.clearAllMocks();
    mockHubListeners.datastore = [];
    mockHubListeners.auth = [];
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
    warnSpy.mockRestore();
  });

  it('REGRESIÓN: clear rechaza → se registra un warn, no hay unhandled rejection y el estado sigue actualizándose', async () => {
    (DataStore.clear as jest.Mock).mockRejectedValue(
      new TypeError("Cannot read property 'clear' of undefined"),
    );

    const { result } = await renderSyncHook();

    await act(async () => {
      fireAuthEvent('signedOut');
      // deja correr la microtask del clear rechazado
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(DataStore.clear).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    // El resto del handler no se ve afectado por el rechazo
    expect(result.current.state).toBe(STATE_SYNC_DS.NOINIT);
    expect(result.current.networkStatus).toBe(false);

    // Sin rechazos sin manejar (era el origen del redbox "Cannot read property 'clear'")
    await new Promise((r) => setImmediate(r));
    expect(unhandled).toHaveLength(0);
  });

  it('camino feliz: signedOut sigue llamando DataStore.clear (paridad con el original)', async () => {
    (DataStore.clear as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderSyncHook();

    await act(async () => {
      fireAuthEvent('signedOut');
      await Promise.resolve();
    });

    expect(DataStore.clear).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(result.current.state).toBe(STATE_SYNC_DS.NOINIT);
  });
});
