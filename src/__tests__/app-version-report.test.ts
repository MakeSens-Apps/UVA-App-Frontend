/**
 * #76 — Report the app version when syncing (UVA-App#34)
 *
 * After each sync with the backend the app writes `appVersion` and `appVersionReportedAt`
 * (UTC ISO 8601) on the person's UVA: when the version changes and at most once per local
 * day. Offline nothing is written; the report goes out on the next sync. The last report
 * lives on the phone and is removed at sign-out.
 *
 * Covers:
 *   1. Pure rules (src/domain/app-version-report).
 *   2. The reporter with fake dependencies: triggers, offline, day cap, update, owner,
 *      disabled UVA, failures and sign-out.
 *   3. The app-wide instance wired to the real session and UvaDSService, over a mocked
 *      DataStore: what is saved on the UVA.
 * Synthetic data only.
 */

/* eslint-disable import/first */

type HubCallback = (data: {
  payload: { event: string; data?: unknown };
}) => void;
const mockHubListeners: Record<string, HubCallback[]> = {};

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

const mockAsyncStorage = new Map<string, string>();
const mockSecureStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (k: string, v: string) => {
    mockAsyncStorage.set(k, v);
  }),
  getItem: jest.fn(async (k: string) => mockAsyncStorage.get(k) ?? null),
  removeItem: jest.fn(async (k: string) => {
    mockAsyncStorage.delete(k);
  }),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecureStore.set(k, v);
  }),
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecureStore.delete(k);
  }),
}));

interface FakeUva {
  id: string;
  userID: string;
  enabled?: boolean | null;
  latitude?: string | null;
  appVersion?: string | null;
  appVersionReportedAt?: string | null;
}

const mockQuery = jest.fn();
const mockSave = jest.fn(async (m: FakeUva) => m);

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    query: (...a: unknown[]) => mockQuery(...a),
    save: (...a: unknown[]) => mockSave(...(a as [FakeUva])),
  },
}));

jest.mock('@/data/models', () => ({
  UVA: {
    copyOf: (source: FakeUva, mutator: (d: FakeUva) => void) => {
      const draft = { ...source };
      mutator(draft);
      return draft;
    },
  },
  User: {},
}));

const mockInstalledVersion = { value: '2.3.1' as string | null };
jest.mock('@/native/device/appVersion', () => ({
  getInstalledAppVersion: () => mockInstalledVersion.value,
}));

import { AppState } from 'react-native';
import type { UVA } from '@/data/models';
import {
  buildAppVersionReport,
  localDayKey,
  parseLastAppVersionReport,
  shouldReportAppVersion,
} from '@/domain/app-version-report/app-version-report';
import {
  appVersionReporter,
  createAppVersionReporter,
  LAST_APP_VERSION_REPORT_KEY,
  type ReportOwner,
} from '@/data/app-version-report/app-version-reporter';
import { sessionService } from '@/data/session/session';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';
const UVA_ID = '00000000-0000-4000-8000-0000000000aa';
const OTHER_UVA_ID = '00000000-0000-4000-8000-0000000000bb';

function datastore(event: string, data?: unknown): void {
  (mockHubListeners.datastore ?? []).forEach((cb) =>
    cb({ payload: { event, data } }),
  );
}

function auth(event: string): void {
  (mockHubListeners.auth ?? []).forEach((cb) => cb({ payload: { event } }));
}

let consoleInfo: jest.SpyInstance;

/** Lets the serialized reporter tasks settle. */
const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

beforeEach(() => {
  for (const channel of Object.keys(mockHubListeners)) {
    mockHubListeners[channel] = [];
  }
  mockAsyncStorage.clear();
  mockSecureStore.clear();
  mockQuery.mockReset();
  mockSave.mockClear();
  mockInstalledVersion.value = '2.3.1';
  consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleInfo.mockRestore();
});

/** Diagnostic lines of the reporter (console.info). */
function reportLogs(): string[] {
  return consoleInfo.mock.calls
    .map((call) => String(call[0]))
    .filter((line) => line.startsWith('[app-version-report]'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — Pure rules
// ─────────────────────────────────────────────────────────────────────────────

describe('app version report rules', () => {
  const last = {
    uvaId: UVA_ID,
    appVersion: '2.3.1',
    reportedAt: new Date(2026, 9, 15, 0, 30).toISOString(),
  };

  it('uses the local day of the phone', () => {
    expect(localDayKey(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    expect(localDayKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('reports when nothing was reported on this phone', () => {
    expect(
      shouldReportAppVersion(null, UVA_ID, '2.3.1', new Date(2026, 9, 15)),
    ).toBe(true);
  });

  it('does not report twice in the same local day with the same version', () => {
    expect(
      shouldReportAppVersion(
        last,
        UVA_ID,
        '2.3.1',
        new Date(2026, 9, 15, 23, 30),
      ),
    ).toBe(false);
  });

  it('reports again on the next local day, even one hour later', () => {
    const lateLast = {
      ...last,
      reportedAt: new Date(2026, 9, 15, 23, 30).toISOString(),
    };
    expect(
      shouldReportAppVersion(
        lateLast,
        UVA_ID,
        '2.3.1',
        new Date(2026, 9, 16, 0, 30),
      ),
    ).toBe(true);
  });

  it('reports a new version the same day', () => {
    expect(
      shouldReportAppVersion(
        last,
        UVA_ID,
        '2.4.0',
        new Date(2026, 9, 15, 10, 0),
      ),
    ).toBe(true);
  });

  it('reports when the last report belongs to another UVA', () => {
    expect(
      shouldReportAppVersion(
        last,
        OTHER_UVA_ID,
        '2.3.1',
        new Date(2026, 9, 15, 10, 0),
      ),
    ).toBe(true);
  });

  it('reports when the stored date is unreadable', () => {
    expect(
      shouldReportAppVersion(
        { ...last, reportedAt: 'not-a-date' },
        UVA_ID,
        '2.3.1',
        new Date(2026, 9, 15, 10, 0),
      ),
    ).toBe(true);
  });

  it('builds both fields together, the date in UTC ISO 8601', () => {
    const now = new Date(Date.UTC(2026, 9, 15, 14, 5, 0));
    expect(buildAppVersionReport('2.3.1', now)).toEqual({
      appVersion: '2.3.1',
      appVersionReportedAt: '2026-10-15T14:05:00.000Z',
    });
  });

  it('treats a malformed stored report as no report', () => {
    expect(parseLastAppVersionReport(null)).toBeNull();
    expect(parseLastAppVersionReport('{')).toBeNull();
    expect(parseLastAppVersionReport('[]')).toBeNull();
    expect(parseLastAppVersionReport('{"uvaId":"x"}')).toBeNull();
    expect(parseLastAppVersionReport(JSON.stringify(last))).toEqual(last);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 — Reporter with fake dependencies
// ─────────────────────────────────────────────────────────────────────────────

describe('app version reporter', () => {
  let clock: Date;
  let owner: ReportOwner;
  let uva: FakeUva | undefined;
  let saved: { uva: FakeUva; report: Record<string, string> }[];
  let saveError: Error | null;
  let foreground: (() => void) | undefined;
  let uvaObserver: ((uvaId: string) => void) | undefined;
  let online: boolean;
  let storageFails: boolean;
  let echoOnSave: boolean;
  let storage: Map<string, string>;

  function makeReporter() {
    const reporter = createAppVersionReporter({
      storage: {
        getItem: async (k) => storage.get(k) ?? null,
        setItem: async (k, v) => {
          if (storageFails) throw new Error('disk full');
          storage.set(k, v);
        },
        removeItem: async (k) => {
          storage.delete(k);
        },
      },
      getInstalledVersion: () => mockInstalledVersion.value,
      getOwner: async () => owner,
      readUva: async () => uva as UVA | undefined,
      saveReport: async (u, report) => {
        if (saveError) throw saveError;
        saved.push({
          uva: u as unknown as FakeUva,
          report: { ...report },
        });
        uva = { ...(u as unknown as FakeUva), ...report };
        // DataStore.observe emits our own write while the save is running.
        if (echoOnSave) uvaObserver?.(u.id);
      },
      isOnline: () => online,
      onForeground: (listener) => {
        foreground = listener;
      },
      observeUvas: (listener) => {
        uvaObserver = listener;
        return () => {
          uvaObserver = undefined;
        };
      },
      now: () => clock,
    });
    reporter.start();
    return reporter;
  }

  beforeEach(() => {
    clock = new Date(2026, 9, 15, 9, 0);
    owner = { userId: USER_ID, uvaId: UVA_ID };
    uva = { id: UVA_ID, userID: USER_ID, enabled: true };
    saved = [];
    saveError = null;
    foreground = undefined;
    uvaObserver = undefined;
    online = true;
    storageFails = false;
    echoOnSave = false;
    storage = new Map();
  });

  it('writes the version and the date on the UVA after a sync', async () => {
    makeReporter();
    online = true;
    datastore('syncQueriesReady');
    await flush();

    expect(saved).toHaveLength(1);
    expect(saved[0].report).toEqual({
      appVersion: '2.3.1',
      appVersionReportedAt: clock.toISOString(),
    });
    expect(uva?.appVersion).toBe('2.3.1');
    expect(uva?.appVersionReportedAt).toBe(clock.toISOString());
    expect(
      JSON.parse(storage.get(LAST_APP_VERSION_REPORT_KEY) ?? '{}'),
    ).toEqual({
      uvaId: UVA_ID,
      appVersion: '2.3.1',
      reportedAt: clock.toISOString(),
    });
  });

  it('writes at most once per local day', async () => {
    makeReporter();
    datastore('syncQueriesReady');
    await flush();
    clock = new Date(2026, 9, 15, 22, 0);
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(1);

    clock = new Date(2026, 9, 16, 7, 0);
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(2);
    expect(saved[1].report.appVersionReportedAt).toBe(clock.toISOString());
  });

  it('reflects an app update on the next sync, the same day', async () => {
    makeReporter();
    datastore('syncQueriesReady');
    await flush();

    // The update restarts the app: same phone storage, new installed version.
    for (const channel of Object.keys(mockHubListeners)) {
      mockHubListeners[channel] = [];
    }
    mockInstalledVersion.value = '2.4.0';
    clock = new Date(2026, 9, 15, 11, 0);
    makeReporter();
    datastore('syncQueriesReady');
    await flush();

    expect(saved).toHaveLength(2);
    expect(saved[1].report.appVersion).toBe('2.4.0');
    expect(uva?.appVersion).toBe('2.4.0');
  });

  it('does not write offline and reports on the next sync with connection', async () => {
    makeReporter();
    online = false;
    foreground?.();
    await flush();
    expect(saved).toHaveLength(0);

    online = true;
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(1);
  });

  it('reports on returning to the foreground only while connected', async () => {
    makeReporter();
    datastore('syncQueriesReady');
    await flush();

    clock = new Date(2026, 9, 17, 8, 0);
    online = false;
    foreground?.();
    await flush();
    expect(saved).toHaveLength(1);

    online = true;
    foreground?.();
    await flush();
    expect(saved).toHaveLength(2);
    expect(saved[1].report.appVersionReportedAt).toBe(clock.toISOString());
  });

  it('reports even if the UVA is disabled (decision in #76)', async () => {
    uva = { id: UVA_ID, userID: USER_ID, enabled: false };
    const reporter = makeReporter();
    await expect(reporter.report()).resolves.toBe('reported');
    expect(saved).toHaveLength(1);
  });

  it('never writes on a UVA of another person', async () => {
    uva = { id: UVA_ID, userID: OTHER_USER_ID, enabled: true };
    const reporter = makeReporter();
    await expect(reporter.report()).resolves.toBe('not-owner');
    expect(saved).toHaveLength(0);
    expect(storage.has(LAST_APP_VERSION_REPORT_KEY)).toBe(false);
  });

  it('skips without a readable version, a session or the UVA on the phone', async () => {
    const reporter = makeReporter();

    mockInstalledVersion.value = null;
    await expect(reporter.report()).resolves.toBe('no-version');

    mockInstalledVersion.value = '2.3.1';
    owner = { userId: null, uvaId: null };
    await expect(reporter.report()).resolves.toBe('no-uva');

    owner = { userId: USER_ID, uvaId: UVA_ID };
    uva = undefined;
    await expect(reporter.report()).resolves.toBe('no-uva');
    expect(saved).toHaveLength(0);

    // Once the UVA reaches the phone, the next sync reports it.
    uva = { id: UVA_ID, userID: USER_ID, enabled: true };
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(1);
  });

  it('keeps no record when the save fails, so the next sync retries', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const reporter = makeReporter();
    saveError = new Error('DataStore not ready');
    await expect(reporter.report()).resolves.toBe('failed');
    expect(storage.has(LAST_APP_VERSION_REPORT_KEY)).toBe(false);

    saveError = null;
    await expect(reporter.report()).resolves.toBe('reported');
    consoleError.mockRestore();
  });

  it('runs concurrent syncs one by one and writes once', async () => {
    makeReporter();
    datastore('syncQueriesReady');
    datastore('syncQueriesReady');
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(1);
  });

  it('forgets the last report at sign-out, so the next account reports', async () => {
    makeReporter();
    datastore('syncQueriesReady');
    await flush();
    expect(storage.has(LAST_APP_VERSION_REPORT_KEY)).toBe(true);

    auth('signedOut');
    await flush();
    expect(storage.has(LAST_APP_VERSION_REPORT_KEY)).toBe(false);

    owner = { userId: OTHER_USER_ID, uvaId: OTHER_UVA_ID };
    uva = { id: OTHER_UVA_ID, userID: OTHER_USER_ID, enabled: true };
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(2);
    expect(saved[1].uva.id).toBe(OTHER_UVA_ID);
  });

  it('never writes the previous UVA when the person signs out mid-report', async () => {
    let releaseRead: (() => void) | undefined;
    const reporter = createAppVersionReporter({
      storage: {
        getItem: async (k) => storage.get(k) ?? null,
        setItem: async (k, v) => {
          storage.set(k, v);
        },
        removeItem: async (k) => {
          storage.delete(k);
        },
      },
      getInstalledVersion: () => '2.3.1',
      getOwner: async () => owner,
      readUva: () =>
        new Promise((resolve) => {
          releaseRead = () => resolve(uva as unknown as UVA);
        }),
      saveReport: async (u, report) => {
        saved.push({ uva: u as unknown as FakeUva, report: { ...report } });
      },
      isOnline: () => true,
      onForeground: () => undefined,
      observeUvas: () => () => undefined,
      now: () => clock,
    });
    reporter.start();

    const outcome = reporter.report();
    await flush();
    auth('signedOut');
    releaseRead?.();

    await expect(outcome).resolves.toBe('no-uva');
    await flush();
    expect(saved).toHaveLength(0);
    expect(storage.has(LAST_APP_VERSION_REPORT_KEY)).toBe(false);
  });

  it('reports a UVA that reaches the phone after the first sync (new registration)', async () => {
    makeReporter();
    datastore('ready');
    expect(uvaObserver).toBeDefined();

    // Just registered: the UVA is created by API and is not on the phone at the sync.
    owner = { userId: USER_ID, uvaId: null };
    uva = undefined;
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(0);

    // Offline changes of the UVA do not write.
    owner = { userId: USER_ID, uvaId: UVA_ID };
    uva = { id: UVA_ID, userID: USER_ID, enabled: true };
    online = false;
    uvaObserver?.(UVA_ID);
    await flush();
    expect(saved).toHaveLength(0);

    // The UVA arrives by subscription while connected.
    online = true;
    uvaObserver?.(UVA_ID);
    await flush();
    expect(saved).toHaveLength(1);

    // The write itself is observed again: no second write.
    uvaObserver?.(UVA_ID);
    await flush();
    expect(saved).toHaveLength(1);
  });

  it('ignores changes of other UVAs once the own UVA is known', async () => {
    makeReporter();
    datastore('ready');
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(1);

    // Next day: a UVA of another member changes; only our own UVA triggers a report.
    clock = new Date(2026, 9, 16, 9, 0);
    uvaObserver?.(OTHER_UVA_ID);
    await flush();
    expect(saved).toHaveLength(1);

    uvaObserver?.(UVA_ID);
    await flush();
    expect(saved).toHaveLength(2);
  });

  it('writes once even if the phone storage fails and the write is observed', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    makeReporter();
    datastore('ready');
    storageFails = true;
    echoOnSave = true;
    datastore('syncQueriesReady');
    await flush();
    uvaObserver?.(UVA_ID);
    await flush();
    expect(saved).toHaveLength(1);
    consoleError.mockRestore();
  });

  it('drops a report requested before the sign-out', async () => {
    let releaseRead: (() => void) | undefined;
    const reporter = createAppVersionReporter({
      storage: {
        getItem: async (k) => storage.get(k) ?? null,
        setItem: async (k, v) => {
          storage.set(k, v);
        },
        removeItem: async (k) => {
          storage.delete(k);
        },
      },
      getInstalledVersion: () => '2.3.1',
      getOwner: async () => owner,
      readUva: () =>
        new Promise((resolve) => {
          releaseRead = () => resolve(uva as unknown as UVA);
        }),
      saveReport: async (u, report) => {
        saved.push({ uva: u as unknown as FakeUva, report: { ...report } });
      },
      isOnline: () => true,
      onForeground: () => undefined,
      observeUvas: () => () => undefined,
      now: () => clock,
    });
    reporter.start();

    const first = reporter.report();
    await flush();
    const queued = reporter.report();
    auth('signedOut');
    releaseRead?.();
    await flush();
    releaseRead?.();

    await expect(first).resolves.toBe('no-uva');
    await expect(queued).resolves.toBe('no-uva');
    expect(saved).toHaveLength(0);
  });

  it('forgets the UVA of a person who signs out while the owner is being resolved', async () => {
    let releaseOwner: (() => void) | undefined;
    const reporter = createAppVersionReporter({
      storage: {
        getItem: async (k) => storage.get(k) ?? null,
        setItem: async (k, v) => {
          storage.set(k, v);
        },
        removeItem: async (k) => {
          storage.delete(k);
        },
      },
      getInstalledVersion: () => '2.3.1',
      getOwner: () =>
        releaseOwner
          ? Promise.resolve(owner)
          : new Promise((resolve) => {
              const pendingOwner = owner;
              releaseOwner = () => resolve(pendingOwner);
            }),
      readUva: async () => uva as UVA | undefined,
      saveReport: async (u, report) => {
        saved.push({ uva: u as unknown as FakeUva, report: { ...report } });
      },
      isOnline: () => true,
      onForeground: () => undefined,
      observeUvas: (listener) => {
        uvaObserver = listener;
        return () => {
          uvaObserver = undefined;
        };
      },
      now: () => clock,
    });
    reporter.start();

    // Person A: the owner lookup is still running when A signs out.
    const first = reporter.report();
    await flush();
    auth('signedOut');
    releaseOwner?.();
    await expect(first).resolves.toBe('no-uva');
    expect(saved).toHaveLength(0);

    // Person B signs in on the same app session and registers: the new UVA arrives by
    // subscription and must be reported, not ignored as "another person's UVA".
    datastore('ready');
    owner = { userId: OTHER_USER_ID, uvaId: OTHER_UVA_ID };
    uva = { id: OTHER_UVA_ID, userID: OTHER_USER_ID, enabled: true };
    uvaObserver?.(OTHER_UVA_ID);
    await flush();
    expect(saved).toHaveLength(1);
    expect(saved[0].uva.id).toBe(OTHER_UVA_ID);
  });

  it('subscribes to the UVA again after each DataStore start', async () => {
    makeReporter();
    datastore('ready');
    const first = uvaObserver;
    auth('signedOut');
    datastore('ready');
    expect(uvaObserver).toBeDefined();
    expect(uvaObserver).not.toBe(first);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 — App-wide instance: session + UvaDSService + DataStore
// ─────────────────────────────────────────────────────────────────────────────

describe('app-wide app version reporter', () => {
  /** UVAs on the phone, as DataStore returns them. */
  let phoneUvas: FakeUva[];
  let addEventListener: jest.SpyInstance;

  beforeEach(() => {
    phoneUvas = [];
    // DataStore.query(UVA, id) or DataStore.query(UVA, (c) => c.<field>.eq(value)).
    mockQuery.mockImplementation(async (_model: unknown, arg: unknown) => {
      if (typeof arg === 'function') {
        const matches = (arg as (c: unknown) => (u: FakeUva) => boolean)(
          new Proxy(
            {},
            {
              get: (_target, field: string) => ({
                eq: (value: unknown) => (u: FakeUva) =>
                  (u as unknown as Record<string, unknown>)[field] === value,
              }),
            },
          ),
        );
        return phoneUvas.filter(matches);
      }
      return phoneUvas.find((u) => u.id === arg);
    });
    addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(() => ({ remove: jest.fn() }));
  });

  afterEach(() => {
    addEventListener.mockRestore();
  });

  /**
   * A fresh app-wide reporter per test: `appVersionReporter` is a module singleton whose
   * start() is idempotent and which keeps its last report in memory.
   */
  function freshAppReporter(): typeof appVersionReporter {
    let reporter: typeof appVersionReporter | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      reporter = require('@/data/app-version-report/app-version-reporter')
        .appVersionReporter as typeof appVersionReporter;
    });
    if (!reporter) throw new Error('reporter module did not load');
    return reporter;
  }

  function storedUva(): FakeUva {
    return {
      id: UVA_ID,
      userID: USER_ID,
      enabled: true,
      latitude: '4.0000',
      appVersion: null,
      appVersionReportedAt: null,
    };
  }

  it('saves only the two version fields on the session UVA after a sync', async () => {
    const stored = storedUva();
    phoneUvas = [stored];

    await sessionService.setInfo({ userID: USER_ID, uvaID: UVA_ID });
    appVersionReporter.start();
    expect(addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );

    datastore('syncQueriesReady');
    await flush();

    expect(mockSave).toHaveBeenCalledTimes(1);
    const savedUva = mockSave.mock.calls[0][0];
    expect(savedUva).toEqual({
      ...stored,
      appVersion: '2.3.1',
      appVersionReportedAt: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
    });
    expect(mockAsyncStorage.get(LAST_APP_VERSION_REPORT_KEY)).toContain(UVA_ID);
  });

  it('reports on the first sync after the login, when the session uvaID is not on the phone', async () => {
    // Seen in develop (#76): right after the login the session holds the first UVA of the
    // UVAbyUserID API query, which DataStore does not have; the auth gate replaces it only
    // after the first sync. The report must not wait for that (nor for the foreground).
    const STALE_UVA_ID = '00000000-0000-4000-8000-0000000000cc';
    const stored = storedUva();
    phoneUvas = [
      { id: OTHER_UVA_ID, userID: OTHER_USER_ID, enabled: true },
      stored,
    ];
    await sessionService.setInfo({ userID: USER_ID, uvaID: STALE_UVA_ID });
    freshAppReporter().start();

    datastore('syncQueriesReady');
    await flush();

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave.mock.calls[0][0]).toMatchObject({
      id: UVA_ID,
      userID: USER_ID,
      appVersion: '2.3.1',
    });
    expect(reportLogs()).toEqual([
      '[app-version-report] trigger=sync outcome=reported write=yes',
    ]);
  });

  it('logs each attempt with its trigger and decision, without ids', async () => {
    phoneUvas = [];
    await sessionService.setInfo({ userID: USER_ID, uvaID: UVA_ID });
    freshAppReporter().start();

    // The UVA is not on the phone yet: nothing is written and the log says why.
    datastore('syncQueriesReady');
    await flush();
    expect(mockSave).not.toHaveBeenCalled();

    phoneUvas = [storedUva()];
    datastore('syncQueriesReady');
    await flush();
    datastore('syncQueriesReady');
    await flush();

    const logs = reportLogs();
    expect(logs).toEqual([
      '[app-version-report] trigger=sync outcome=no-uva detail=no-uva-on-phone write=no',
      '[app-version-report] trigger=sync outcome=reported write=yes',
      '[app-version-report] trigger=sync outcome=up-to-date write=no',
    ]);
    for (const line of logs) {
      expect(line).not.toContain(USER_ID);
      expect(line).not.toContain(UVA_ID);
    }
  });
});
