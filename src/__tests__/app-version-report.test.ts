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
});

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
  let storage: Map<string, string>;

  function makeReporter() {
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
      },
      onForeground: (listener) => {
        foreground = listener;
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
    storage = new Map();
  });

  it('writes the version and the date on the UVA after a sync', async () => {
    makeReporter();
    datastore('networkStatus', { active: true });
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
    datastore('networkStatus', { active: false });
    foreground?.();
    await flush();
    expect(saved).toHaveLength(0);

    datastore('networkStatus', { active: true });
    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(1);
  });

  it('reports on returning to the foreground only while connected', async () => {
    makeReporter();
    datastore('syncQueriesReady');
    await flush();

    clock = new Date(2026, 9, 17, 8, 0);
    datastore('networkStatus', { active: false });
    foreground?.();
    await flush();
    expect(saved).toHaveLength(1);

    datastore('networkStatus', { active: true });
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

    // After sign-out the reporter waits for a sync: the foreground alone does not write.
    owner = { userId: OTHER_USER_ID, uvaId: OTHER_UVA_ID };
    uva = { id: OTHER_UVA_ID, userID: OTHER_USER_ID, enabled: true };
    foreground?.();
    await flush();
    expect(saved).toHaveLength(1);

    datastore('syncQueriesReady');
    await flush();
    expect(saved).toHaveLength(2);
    expect(saved[1].uva.id).toBe(OTHER_UVA_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 — App-wide instance: session + UvaDSService + DataStore
// ─────────────────────────────────────────────────────────────────────────────

describe('app-wide app version reporter', () => {
  it('saves only the two version fields on the session UVA after a sync', async () => {
    const addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(() => ({ remove: jest.fn() }));
    const stored: FakeUva = {
      id: UVA_ID,
      userID: USER_ID,
      enabled: true,
      latitude: '4.0000',
      appVersion: null,
      appVersionReportedAt: null,
    };
    mockQuery.mockResolvedValue(stored);

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
    addEventListener.mockRestore();
  });
});
