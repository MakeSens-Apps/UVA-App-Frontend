/**
 * F4-05 (#60) — registration lock: ADR-005 rule, minimum version, reactivation notice and
 * reminder pause. Domain functions are pure; the service is tested with in-memory storage.
 */

import {
  UVA_UNSET_ENABLED_CUTOFF,
  canProposeStreakRecovery,
  detectReactivation,
  getEffectiveUvaStatus,
  isUpdateRequired,
  parseVersion,
  parseVersionPolicy,
  resolveRegistrationLock,
  shouldPauseReminders,
  withoutStreakRecoveryProposals,
} from '@/domain/registration-lock/registration-lock';
import type { GamificationEventSubtype } from '@/domain/gamification/gamification-alerts-types';

// ─── Mocks for the service ───────────────────────────────────────────────────

const mockStorage = new Map<string, string>();
jest.mock('@/data/storage/preferences', () => ({
  Preferences: {
    get: jest.fn(({ key }: { key: string }) =>
      Promise.resolve({ value: mockStorage.get(key) ?? null }),
    ),
    set: jest.fn(({ key, value }: { key: string; value: string }) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    remove: jest.fn(({ key }: { key: string }) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
  },
}));

const mockSession: { uvaID?: string; userID?: string; racimoID?: string } = {
  uvaID: 'uva-0001',
  userID: 'user-0001',
  racimoID: 'racimo-test-1',
};
jest.mock('@/data/session/session', () => ({
  sessionService: { getInfo: jest.fn(() => Promise.resolve(mockSession)) },
}));

const mockUvas = new Map<string, { id: string; enabled?: boolean | null }>();
const mockGetUVA = jest.fn((id: string) => Promise.resolve(mockUvas.get(id)));
jest.mock('@/data/datastore/uva-ds', () => ({
  UvaDSService: { getUVA: (id: string) => mockGetUVA(id) },
}));
// F4-06 (#61): the service also reads the RACIMO; these tests keep it active so they still
// exercise the UVA rules of #60 only.
const mockRacimos = new Map<
  string,
  { id: string; Name?: string | null; enabled?: boolean | null }
>();
const mockGetRACIMO = jest.fn((id: string) =>
  Promise.resolve(mockRacimos.get(id)),
);
jest.mock('@/data/datastore/racimo-ds', () => ({
  RacimoDSService: { getRACIMO: (id: string) => mockGetRACIMO(id) },
}));
const mockEnsureSessionUvaID = jest.fn(() =>
  Promise.resolve<string | undefined>(undefined),
);
jest.mock('@/data/datastore/user-ds', () => ({
  UserDSService: { ensureSessionUvaID: () => mockEnsureSessionUvaID() },
}));

jest.mock('@/native/notifications/LocalRemindersService', () => {
  const reminders = {
    paused: false,
    setRemindersPaused: jest.fn((p: boolean) => {
      reminders.paused = p;
    }),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    getEnableNotifications: jest.fn(() => Promise.resolve(true)),
    scheduleDailyNotifications: jest.fn(() => Promise.resolve()),
  };
  return { localRemindersService: reminders };
});
const mockReminders = (
  jest.requireMock('@/native/notifications/LocalRemindersService') as {
    localRemindersService: {
      paused: boolean;
      setRemindersPaused: jest.Mock;
      cancelAllNotifications: jest.Mock;
      getEnableNotifications: jest.Mock;
      scheduleDailyNotifications: jest.Mock;
    };
  }
).localRemindersService;

let mockInstalledVersion: string | null = '2.3.1';
jest.mock('@/native/device/appVersion', () => ({
  getInstalledAppVersion: () => mockInstalledVersion,
}));

const mockGetFile = jest.fn();
jest.mock('@/data/storage/s3', () => ({
  s3Service: { getFile: (path: string) => mockGetFile(path) },
}));

// eslint-disable-next-line import/first
import { RegistrationLockService } from '@/data/registration-lock/registration-lock-service';
// eslint-disable-next-line import/first
import {
  VERSION_POLICY_CACHE_KEY,
  VERSION_POLICY_PATH,
  refreshMinimumVersion,
} from '@/data/registration-lock/version-policy';
// eslint-disable-next-line import/first
import { UVA_STATUS_STORE_KEY } from '@/data/registration-lock/uva-status-store';

const BEFORE_CUTOFF = new Date('2026-11-25T04:59:59Z');
const AT_CUTOFF = new Date('2026-11-25T05:00:00Z');

// ─── Domain ──────────────────────────────────────────────────────────────────

describe('getEffectiveUvaStatus (ADR-005 decision 1 and 12)', () => {
  it('enabled === true is enabled, before and after the cut-off', () => {
    expect(getEffectiveUvaStatus({ enabled: true }, BEFORE_CUTOFF)).toBe(
      'enabled',
    );
    expect(getEffectiveUvaStatus({ enabled: true }, AT_CUTOFF)).toBe('enabled');
  });

  it('enabled === false is disabled, before and after the cut-off', () => {
    expect(getEffectiveUvaStatus({ enabled: false }, BEFORE_CUTOFF)).toBe(
      'disabled',
    );
    expect(getEffectiveUvaStatus({ enabled: false }, AT_CUTOFF)).toBe(
      'disabled',
    );
  });

  it('unset enabled counts as enabled until 2026-11-25 00:00 Colombia and disabled from then on', () => {
    expect(UVA_UNSET_ENABLED_CUTOFF.toISOString()).toBe(
      '2026-11-25T05:00:00.000Z',
    );
    for (const enabled of [null, undefined]) {
      expect(getEffectiveUvaStatus({ enabled }, BEFORE_CUTOFF)).toBe('enabled');
      expect(getEffectiveUvaStatus({ enabled }, AT_CUTOFF)).toBe('disabled');
    }
  });

  it('a UVA that is not on the phone yet is unknown', () => {
    expect(getEffectiveUvaStatus(undefined, AT_CUTOFF)).toBe('unknown');
    expect(getEffectiveUvaStatus(null, AT_CUTOFF)).toBe('unknown');
  });
});

describe('minimum version (decision 13, O4)', () => {
  it('parses strict MAJOR.MINOR.PATCH only', () => {
    expect(parseVersion('2.3.1')).toEqual([2, 3, 1]);
    expect(parseVersion(' 10.0.12 ')).toEqual([10, 0, 12]);
    expect(parseVersion('2.3')).toBeNull();
    expect(parseVersion('v2.3.1')).toBeNull();
    expect(parseVersion('2.3.1-beta')).toBeNull();
    expect(parseVersion(null)).toBeNull();
  });

  it('validates the policy file', () => {
    expect(parseVersionPolicy({ minimumVersion: '99.0.0' })).toBe('99.0.0');
    expect(parseVersionPolicy({ minimumVersion: '' })).toBe('');
    expect(parseVersionPolicy({ minimumVersion: '99' })).toBeNull();
    expect(parseVersionPolicy({ minimumVersion: 99 })).toBeNull();
    expect(parseVersionPolicy({})).toBeNull();
    expect(parseVersionPolicy([])).toBeNull();
    expect(parseVersionPolicy('99.0.0')).toBeNull();
    expect(parseVersionPolicy(null)).toBeNull();
  });

  it('requires an update only when the installed version is lower (numeric comparison)', () => {
    expect(isUpdateRequired('2.3.1', '99.0.0')).toBe(true);
    expect(isUpdateRequired('2.3.1', '2.3.2')).toBe(true);
    expect(isUpdateRequired('2.9.0', '2.10.0')).toBe(true);
    expect(isUpdateRequired('2.3.1', '2.3.1')).toBe(false);
    expect(isUpdateRequired('2.10.0', '2.9.9')).toBe(false);
  });

  it('never blocks without a minimum or with an unreadable installed version', () => {
    expect(isUpdateRequired('2.3.1', '')).toBe(false);
    expect(isUpdateRequired('2.3.1', null)).toBe(false);
    expect(isUpdateRequired(null, '99.0.0')).toBe(false);
  });
});

describe('resolveRegistrationLock', () => {
  it('shows one notice, UVA disabled before update required', () => {
    expect(
      resolveRegistrationLock({ uvaStatus: 'disabled', updateRequired: true }),
    ).toBe('uva-disabled');
    expect(
      resolveRegistrationLock({ uvaStatus: 'enabled', updateRequired: true }),
    ).toBe('update-required');
    expect(
      resolveRegistrationLock({ uvaStatus: 'enabled', updateRequired: false }),
    ).toBeNull();
  });

  it('unknown status never locks', () => {
    expect(
      resolveRegistrationLock({ uvaStatus: 'unknown', updateRequired: false }),
    ).toBeNull();
  });

  it('reminders pause with any lock; streak recovery is hidden only with the station disabled (O6)', () => {
    expect(shouldPauseReminders('uva-disabled')).toBe(true);
    expect(shouldPauseReminders('update-required')).toBe(true);
    expect(shouldPauseReminders(null)).toBe(false);
    // Decided on the station status (UVA + RACIMO), not on the prioritized reason.
    expect(canProposeStreakRecovery('disabled')).toBe(false);
    expect(canProposeStreakRecovery('enabled')).toBe(true);
    expect(canProposeStreakRecovery('unknown')).toBe(true);
  });

  it('hides existing "Recupera tu racha" alerts only with the station disabled (P34)', () => {
    const alerts: { id: string; subtype?: GamificationEventSubtype }[] = [
      { id: 'a1', subtype: 'streak_recovery' },
      { id: 'a2', subtype: 'streak_lost' },
      { id: 'a3' },
    ];
    expect(
      withoutStreakRecoveryProposals(alerts, 'disabled').map((a) => a.id),
    ).toEqual(['a2', 'a3']);
    expect(withoutStreakRecoveryProposals(alerts, 'enabled')).toBe(alerts);
    expect(withoutStreakRecoveryProposals(alerts, 'unknown')).toBe(alerts);
  });
});

describe('detectReactivation', () => {
  it('first open: remembers the status and does not notify', () => {
    expect(detectReactivation(undefined, 'enabled')).toEqual({
      remember: 'enabled',
      reactivated: false,
    });
  });

  it('disabled → enabled notifies', () => {
    expect(detectReactivation('disabled', 'enabled').reactivated).toBe(true);
  });

  it('unknown keeps what is stored and never notifies', () => {
    expect(detectReactivation('disabled', 'unknown')).toEqual({
      remember: undefined,
      reactivated: false,
    });
  });

  it('enabled → enabled and enabled → disabled do not notify', () => {
    expect(detectReactivation('enabled', 'enabled').reactivated).toBe(false);
    expect(detectReactivation('enabled', 'disabled').reactivated).toBe(false);
  });
});

// ─── Version policy (S3 + cache) ─────────────────────────────────────────────

describe('refreshMinimumVersion', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockGetFile.mockReset();
  });

  it('reads public/app/version-policy.json and caches a valid value', async () => {
    mockGetFile.mockResolvedValue({
      success: true,
      data: { type: 'JSON', content: { minimumVersion: '99.0.0' } },
    });
    await expect(refreshMinimumVersion()).resolves.toBe('99.0.0');
    expect(mockGetFile).toHaveBeenCalledWith(VERSION_POLICY_PATH);
    expect(VERSION_POLICY_PATH).toBe('public/app/version-policy.json');
    expect(mockStorage.get(VERSION_POLICY_CACHE_KEY)).toBe('99.0.0');
  });

  it('an empty minimum is valid and replaces the cached requirement', async () => {
    mockStorage.set(VERSION_POLICY_CACHE_KEY, '99.0.0');
    mockGetFile.mockResolvedValue({
      success: true,
      data: { type: 'JSON', content: { minimumVersion: '' } },
    });
    await expect(refreshMinimumVersion()).resolves.toBe('');
    expect(mockStorage.get(VERSION_POLICY_CACHE_KEY)).toBe('');
  });

  it('read error (offline, missing file) uses the last known value', async () => {
    mockStorage.set(VERSION_POLICY_CACHE_KEY, '3.0.0');
    mockGetFile.mockResolvedValue({
      success: false,
      error: { type: 'network' },
    });
    await expect(refreshMinimumVersion()).resolves.toBe('3.0.0');
  });

  it('malformed file uses the last known value and does not overwrite it', async () => {
    mockStorage.set(VERSION_POLICY_CACHE_KEY, '3.0.0');
    mockGetFile.mockResolvedValue({
      success: true,
      data: { type: 'JSON', content: { minimumVersion: 'latest' } },
    });
    await expect(refreshMinimumVersion()).resolves.toBe('3.0.0');
    expect(mockStorage.get(VERSION_POLICY_CACHE_KEY)).toBe('3.0.0');
  });

  it('never read and unreadable → no requirement', async () => {
    mockGetFile.mockResolvedValue({ success: false, error: {} });
    await expect(refreshMinimumVersion()).resolves.toBeNull();
  });
});

// ─── Service ─────────────────────────────────────────────────────────────────

describe('RegistrationLockService', () => {
  let service: RegistrationLockService;

  beforeEach(() => {
    mockStorage.clear();
    mockUvas.clear();
    mockRacimos.clear();
    mockRacimos.set('racimo-test-1', {
      id: 'racimo-test-1',
      Name: 'Prueba sintética',
      enabled: true,
    });
    mockSession.uvaID = 'uva-0001';
    mockSession.userID = 'user-0001';
    mockSession.racimoID = 'racimo-test-1';
    mockInstalledVersion = '2.3.1';
    mockReminders.paused = false;
    jest.clearAllMocks();
    service = new RegistrationLockService();
  });

  it('first sync pending (UVA not on the phone): no lock, no notice', async () => {
    const state = await service.evaluate(AT_CUTOFF);
    expect(state).toEqual({
      uvaId: 'uva-0001',
      uvaStatus: 'unknown',
      racimoId: 'racimo-test-1',
      racimoStatus: 'active',
      racimoName: 'Prueba sintética',
      stationStatus: 'unknown',
      reason: null,
      reactivationPending: false,
    });
    expect(mockReminders.cancelAllNotifications).not.toHaveBeenCalled();
  });

  it('disabled UVA locks registering and pauses reminders without touching the preference', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    const state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reason).toBe('uva-disabled');
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(true);
    expect(mockReminders.cancelAllNotifications).toHaveBeenCalledTimes(1);
    // The preference is never written by the service.
    expect(
      [...mockStorage.keys()].filter((k) => k.startsWith('notification')),
    ).toEqual([]);
  });

  it('offline: decides with the last synced UVA (enabled locally → can register)', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    const state = await service.evaluate(AT_CUTOFF);
    expect(state.reason).toBeNull();
  });

  it('reactivation: notice once, reminders rescheduled, and not on the first open', async () => {
    // First open with the UVA disabled: remembered, no notice.
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    let state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reactivationPending).toBe(false);

    // Next sync: enabled.
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reason).toBeNull();
    expect(state.reactivationPending).toBe(true);
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(false);
    expect(mockReminders.scheduleDailyNotifications).toHaveBeenCalledTimes(1);

    // Shown once → consumed → never again.
    await service.consumeReactivationNotice('uva-0001');
    state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reactivationPending).toBe(false);
  });

  it('reactivation does not reschedule reminders the person turned off', async () => {
    mockReminders.getEnableNotifications.mockResolvedValueOnce(false);
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    await service.evaluate(BEFORE_CUTOFF);
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    await service.evaluate(BEFORE_CUTOFF);
    expect(mockReminders.scheduleDailyNotifications).not.toHaveBeenCalled();
  });

  it('first open with the UVA enabled: no notice', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    const state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reactivationPending).toBe(false);
  });

  it('unknown → enabled (data arrives after the first sync) is not a reactivation', async () => {
    await service.evaluate(AT_CUTOFF);
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    const state = await service.evaluate(AT_CUTOFF);
    expect(state.reactivationPending).toBe(false);
  });

  it('a pending notice is dropped if the UVA is disabled again before it was shown', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    await service.evaluate(BEFORE_CUTOFF);
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    await service.evaluate(BEFORE_CUTOFF);
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    await service.evaluate(BEFORE_CUTOFF);
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    // Reactivated again → a fresh notice, still only one pending.
    const state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reactivationPending).toBe(true);
  });

  it('memory is per UVA and cleared at sign-out (another account sees no foreign notice)', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    await service.evaluate(BEFORE_CUTOFF);
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    await service.evaluate(BEFORE_CUTOFF);
    expect(mockStorage.has(UVA_STATUS_STORE_KEY)).toBe(true);

    await service.clearForSignOut();
    expect(mockStorage.has(UVA_STATUS_STORE_KEY)).toBe(false);
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(false);

    // Another account on the same phone, another UVA.
    mockSession.uvaID = 'uva-0002';
    mockUvas.set('uva-0002', { id: 'uva-0002', enabled: true });
    const state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reactivationPending).toBe(false);
  });

  it('minimum version above the installed one locks registering (update required)', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    mockGetFile.mockResolvedValue({
      success: true,
      data: { type: 'JSON', content: { minimumVersion: '99.0.0' } },
    });
    await service.refreshVersionPolicy();
    const state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reason).toBe('update-required');
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(true);
  });

  it('update-required uses the cached minimum when S3 cannot be read', async () => {
    mockStorage.set(VERSION_POLICY_CACHE_KEY, '99.0.0');
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    mockGetFile.mockResolvedValue({ success: false, error: {} });
    await service.refreshVersionPolicy();
    expect((await service.evaluate(BEFORE_CUTOFF)).reason).toBe(
      'update-required',
    );
  });

  it('reactivation after a minimum-version update is not announced', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: true });
    mockStorage.set(VERSION_POLICY_CACHE_KEY, '99.0.0');
    let state = await service.evaluate(BEFORE_CUTOFF);
    expect(state.reason).toBe('update-required');
    mockInstalledVersion = '99.0.0';
    state = await new RegistrationLockService().evaluate(BEFORE_CUTOFF);
    expect(state.reason).toBeNull();
    expect(state.reactivationPending).toBe(false);
  });

  it('a DataStore read error before any read counts as unknown and does not lock', async () => {
    mockGetUVA.mockRejectedValueOnce(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const state = await service.evaluate(AT_CUTOFF);
    spy.mockRestore();
    expect(state.reason).toBeNull();
    expect(state.uvaStatus).toBe('unknown');
  });

  it('a transient read error keeps the lock and the reminder pause (B2)', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    expect((await service.evaluate(BEFORE_CUTOFF)).reason).toBe('uva-disabled');

    mockGetUVA.mockRejectedValueOnce(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const state = await service.evaluate(BEFORE_CUTOFF);
    spy.mockRestore();
    expect(state.reason).toBe('uva-disabled');
    expect(mockReminders.setRemindersPaused).toHaveBeenLastCalledWith(true);
    expect(mockReminders.scheduleDailyNotifications).not.toHaveBeenCalled();
  });

  it('a read error on a fresh app session falls back to the status remembered for the UVA', async () => {
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    await service.evaluate(BEFORE_CUTOFF);

    const fresh = new RegistrationLockService();
    mockGetUVA.mockRejectedValueOnce(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const state = await fresh.evaluate(BEFORE_CUTOFF);
    spy.mockRestore();
    expect(state.reason).toBe('uva-disabled');
  });

  it('session without uvaID: repairs it from the local User before deciding (B4)', async () => {
    mockSession.uvaID = undefined;
    mockEnsureSessionUvaID.mockResolvedValueOnce('uva-0001');
    mockUvas.set('uva-0001', { id: 'uva-0001', enabled: false });
    const state = await service.evaluate(BEFORE_CUTOFF);
    expect(mockEnsureSessionUvaID).toHaveBeenCalledTimes(1);
    expect(state.uvaId).toBe('uva-0001');
    expect(state.reason).toBe('uva-disabled');
  });

  it('signed out (no userID): no repair, no lock, and the policy is not read from S3', async () => {
    mockSession.uvaID = undefined;
    mockSession.userID = undefined;
    const state = await service.evaluate(BEFORE_CUTOFF);
    expect(mockEnsureSessionUvaID).not.toHaveBeenCalled();
    expect(state.reason).toBeNull();
    await service.refreshVersionPolicy();
    expect(mockGetFile).not.toHaveBeenCalled();
  });
});
