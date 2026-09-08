/**
 * B17 — Native integrations tests
 *
 * Gate requirements (plan.md B17):
 *  1. Lógica de horarios (próxima ocurrencia 6/18h) — getNextReminderTimes
 *  2. Contrato de cancelación (mock expo-notifications: cancelAll llamado) — R-48 fix
 *  3. Mapeo de API levels (A12=31, A15=35) — R-25
 *  4. routesToMinimize contiene las rutas raíz correctas
 *  5. minimizeApp llama NativeModules.AppMinimize.minimize cuando está disponible
 *  6. minimizeApp hace fallback a BackHandler.exitApp cuando el módulo no existe
 *
 * NOTE: No emulator/device — pure unit tests. The integrator's functional
 * script verifies the real device behavior (see StructuredOutput.notes).
 *
 * IMPORTANT: jest.mock factories are hoisted BEFORE const declarations.
 * All factory functions use jest.fn() directly (cannot reference outer variables).
 * Use jest.requireMock() after imports to get references to mock functions.
 */

/* eslint-disable import/first */

// ─── Mocks (hoisted, no outer-scope references) ───────────────────────────────

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: 35, // API 35 = Android 15
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    exitApp: jest.fn(),
  },
  NativeModules: {
    AppMinimize: {
      minimize: jest.fn(),
    },
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true, expires: 'never', canAskAgain: true }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true, expires: 'never', canAskAgain: true }),
  ),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('test-id')),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  AndroidImportance: {
    UNKNOWN: 0,
    UNSPECIFIED: 1,
    NONE: 2,
    MIN: 3,
    LOW: 4,
    DEFAULT: 5,
    HIGH: 6,
    MAX: 7,
  },
  AndroidNotificationPriority: {
    MIN: 'min',
    LOW: 'low',
    DEFAULT: 'default',
    HIGH: 'high',
    MAX: 'max',
  },
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    DATE: 'date',
  },
}));

jest.mock('expo-device', () => ({
  platformApiLevel: 35,
}));


jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/data/storage/preferences', () => ({
  Preferences: {
    get: jest.fn(() => Promise.resolve({ value: null })),
    set: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
  NOTIFICATION_PERMISSION_KEY: 'notificationPermissionGrantedUser',
  NOTIFICATION_PROGRAMMED_KEY: 'notificationPermissionProgrammed',
}));

// ─── Imports (AFTER mocks) ────────────────────────────────────────────────────

import { localRemindersService } from '@/native/notifications/LocalRemindersService';
import {
  API_LEVEL_ANDROID_12,
  API_LEVEL_ANDROID_15,
  isAndroid12OrAbove,
  isAndroid13OrAbove,
  isAndroid15OrAbove,
} from '@/native/device/apiLevel';
import { ROUTES_TO_MINIMIZE } from '@/native/minimize/routesToMinimize';
import { minimizeApp } from '@/native/minimize/useAppMinimize';

// ─── Mock references (obtained AFTER imports, via requireMock) ────────────────

const NotificationsMock = jest.requireMock('expo-notifications') as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelAllScheduledNotificationsAsync: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
};

const PreferencesMock = (jest.requireMock('@/data/storage/preferences') as {
  Preferences: {
    get: jest.Mock;
    set: jest.Mock;
    remove: jest.Mock;
    clear: jest.Mock;
  };
}).Preferences;

const RNMock = jest.requireMock('react-native') as {
  BackHandler: { exitApp: jest.Mock; addEventListener: jest.Mock };
  NativeModules: { AppMinimize?: { minimize: jest.Mock } };
  Platform: { OS: string; Version: number };
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: permissions granted, no notifications programmed
  NotificationsMock.getPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    expires: 'never',
    canAskAgain: true,
  });
  NotificationsMock.requestPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    expires: 'never',
    canAskAgain: true,
  });
  NotificationsMock.scheduleNotificationAsync.mockResolvedValue('test-id');
  NotificationsMock.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
  NotificationsMock.setNotificationChannelAsync.mockResolvedValue(null);

  PreferencesMock.get.mockResolvedValue({ value: null });
  PreferencesMock.set.mockResolvedValue(undefined);
  PreferencesMock.remove.mockResolvedValue(undefined);

  // Restore native module
  RNMock.NativeModules.AppMinimize = { minimize: jest.fn() };
  RNMock.Platform.OS = 'android';
});

// =============================================================================
// 1. Lógica de horarios — getNextReminderTimes (pure function)
// =============================================================================

describe('getNextReminderTimes', () => {
  describe('when current time is BEFORE both reminder hours', () => {
    it('returns today for morning (6h) and afternoon (18h)', () => {
      // 5:00 AM — both 6h and 18h are in the future today
      const now = new Date(2025, 0, 15, 5, 0, 0); // Jan 15, 05:00
      const { morning, afternoon } = localRemindersService.getNextReminderTimes(now);

      expect(morning.getFullYear()).toBe(2025);
      expect(morning.getMonth()).toBe(0);
      expect(morning.getDate()).toBe(15);
      expect(morning.getHours()).toBe(6);
      expect(morning.getMinutes()).toBe(0);

      expect(afternoon.getFullYear()).toBe(2025);
      expect(afternoon.getDate()).toBe(15);
      expect(afternoon.getHours()).toBe(18);
      expect(afternoon.getMinutes()).toBe(0);
    });
  });

  describe('when current time is PAST morning but BEFORE afternoon', () => {
    it('morning advances to tomorrow, afternoon stays today', () => {
      // 10:00 AM — 6h has passed, 18h is still ahead
      const now = new Date(2025, 0, 15, 10, 0, 0); // Jan 15, 10:00
      const { morning, afternoon } = localRemindersService.getNextReminderTimes(now);

      // Morning should be Jan 16
      expect(morning.getDate()).toBe(16);
      expect(morning.getHours()).toBe(6);

      // Afternoon should still be Jan 15
      expect(afternoon.getDate()).toBe(15);
      expect(afternoon.getHours()).toBe(18);
    });
  });

  describe('when current time is PAST both reminder hours', () => {
    it('both times advance to tomorrow', () => {
      // 11:00 PM — both 6h and 18h have passed
      const now = new Date(2025, 0, 15, 23, 0, 0); // Jan 15, 23:00
      const { morning, afternoon } = localRemindersService.getNextReminderTimes(now);

      expect(morning.getDate()).toBe(16);
      expect(morning.getHours()).toBe(6);

      expect(afternoon.getDate()).toBe(16);
      expect(afternoon.getHours()).toBe(18);
    });
  });

  describe('edge case: exactly at the scheduled hour', () => {
    it('advances to tomorrow when now >= scheduled time (boundary)', () => {
      // Exactly at 6:00 AM — at the boundary, should advance
      const now = new Date(2025, 0, 15, 6, 0, 0); // Jan 15, 06:00:00
      const { morning } = localRemindersService.getNextReminderTimes(now);

      expect(morning.getDate()).toBe(16);
    });

    it('stays today when 5:59 (just before 6h)', () => {
      const now = new Date(2025, 0, 15, 5, 59, 59);
      const { morning } = localRemindersService.getNextReminderTimes(now);

      expect(morning.getDate()).toBe(15);
    });
  });

  describe('custom hours', () => {
    it('uses custom morningHour and afternoonHour', () => {
      const now = new Date(2025, 0, 15, 7, 0, 0); // 7:00 AM
      // Morning = 8h (still ahead), afternoon = 20h (still ahead)
      const { morning, afternoon } = localRemindersService.getNextReminderTimes(
        now,
        8,
        20,
      );

      expect(morning.getDate()).toBe(15);
      expect(morning.getHours()).toBe(8);

      expect(afternoon.getDate()).toBe(15);
      expect(afternoon.getHours()).toBe(20);
    });
  });
});

// =============================================================================
// 2. cancelAllNotifications — R-48 BUG FIX
// =============================================================================

describe('cancelAllNotifications — R-48 fix', () => {
  it('calls cancelAllScheduledNotificationsAsync (not just removeAllListeners)', async () => {
    await localRemindersService.cancelAllNotifications();

    expect(NotificationsMock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('removes NOTIFICATION_PROGRAMMED_KEY from Preferences', async () => {
    await localRemindersService.cancelAllNotifications();

    expect(PreferencesMock.remove).toHaveBeenCalledWith({
      key: 'notificationPermissionProgrammed',
    });
  });

  it('is idempotent: can be called multiple times', async () => {
    await localRemindersService.cancelAllNotifications();
    await localRemindersService.cancelAllNotifications();

    expect(NotificationsMock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
  });

  it('does NOT just remove listeners — ensures OS alarms are cancelled (R-48)', async () => {
    // The original bug: only removeAllListeners() was called, which does NOT
    // cancel OS-level alarms. This test verifies the FIX is in place.
    await localRemindersService.cancelAllNotifications();

    // cancelAllScheduledNotificationsAsync is the REAL cancel (OS-level)
    expect(NotificationsMock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// 3. scheduleDailyNotifications — DAILY trigger
// =============================================================================

describe('scheduleDailyNotifications', () => {
  it('schedules two notifications (morning + afternoon) when not programmed', async () => {
    PreferencesMock.get.mockResolvedValue({ value: null });

    await localRemindersService.scheduleDailyNotifications();

    expect(NotificationsMock.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('uses DailyTriggerInput (type: "daily") for both notifications', async () => {
    PreferencesMock.get.mockResolvedValue({ value: null });

    await localRemindersService.scheduleDailyNotifications();

    const calls = NotificationsMock.scheduleNotificationAsync.mock.calls;
    expect(calls).toHaveLength(2);

    const morningTrigger = (calls[0][0] as any).trigger;
    const afternoonTrigger = (calls[1][0] as any).trigger;

    expect(morningTrigger.type).toBe('daily');
    expect(afternoonTrigger.type).toBe('daily');
  });

  it('schedules morning at hour 6 and afternoon at hour 18 (defaults)', async () => {
    PreferencesMock.get.mockResolvedValue({ value: null });

    await localRemindersService.scheduleDailyNotifications();

    const calls = NotificationsMock.scheduleNotificationAsync.mock.calls;
    expect((calls[0][0] as any).trigger.hour).toBe(6);
    expect((calls[1][0] as any).trigger.hour).toBe(18);
  });

  it('respects custom morning and afternoon hours', async () => {
    PreferencesMock.get.mockResolvedValue({ value: null });

    await localRemindersService.scheduleDailyNotifications(7, 19);

    const calls = NotificationsMock.scheduleNotificationAsync.mock.calls;
    expect((calls[0][0] as any).trigger.hour).toBe(7);
    expect((calls[1][0] as any).trigger.hour).toBe(19);
  });

  // Regression: expo-notifications treats a STRING `sound` as a custom sound
  // FILENAME. Passing 'default' made the native module log
  // "Custom sound 'default' not found in native app". The boolean `true` is the
  // documented way to ask for the OS default sound.
  it('uses sound: true (not the string "default") for both notifications', async () => {
    PreferencesMock.get.mockResolvedValue({ value: null });

    await localRemindersService.scheduleDailyNotifications();

    const calls = NotificationsMock.scheduleNotificationAsync.mock.calls;
    expect(calls).toHaveLength(2);

    for (const call of calls) {
      const { sound } = (call[0] as any).content;
      expect(sound).toBe(true);
      expect(typeof sound).not.toBe('string');
    }
  });

  it('saves programmed flag to Preferences after scheduling', async () => {
    PreferencesMock.get.mockResolvedValue({ value: null });

    await localRemindersService.scheduleDailyNotifications();

    expect(PreferencesMock.set).toHaveBeenCalledWith({
      key: 'notificationPermissionProgrammed',
      value: JSON.stringify({ programmed: true }),
    });
  });

  it('is idempotent: skips scheduling if already programmed', async () => {
    PreferencesMock.get.mockResolvedValue({
      value: JSON.stringify({ programmed: true }),
    });

    await localRemindersService.scheduleDailyNotifications();

    expect(NotificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('does NOT schedule if permission is denied', async () => {
    NotificationsMock.getPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      expires: 'never',
      canAskAgain: false,
    });
    NotificationsMock.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      expires: 'never',
      canAskAgain: false,
    });
    PreferencesMock.get.mockResolvedValue({ value: null });

    await localRemindersService.scheduleDailyNotifications();

    expect(NotificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 3b. createNotificationChannels — default channel sound
// =============================================================================

describe('createNotificationChannels', () => {
  // Regression: the Android channel manager resolves a STRING `sound` as a bundled
  // sound-asset filename, so `sound: 'default'` produced
  // "Custom sound 'default' not found in native app".
  //
  // Omitting the key is what yields Settings.System.DEFAULT_NOTIFICATION_URI.
  // `sound: null` is NOT equivalent — for a channel it means "no sound at all".
  it('omits `sound` so the channel keeps the OS default notification sound', async () => {
    await localRemindersService.createNotificationChannels();

    expect(NotificationsMock.setNotificationChannelAsync).toHaveBeenCalledTimes(1);

    const [, options] = NotificationsMock.setNotificationChannelAsync.mock.calls[0];
    expect(Object.prototype.hasOwnProperty.call(options, 'sound')).toBe(false);
    expect((options as any).sound).toBeUndefined();
  });
});

// =============================================================================
// 4. API level mapping — R-25 (A12=API31, A15=API35)
// =============================================================================

describe('API level mapping (R-25)', () => {
  describe('constants', () => {
    it('API_LEVEL_ANDROID_12 is 31', () => {
      expect(API_LEVEL_ANDROID_12).toBe(31);
    });

    it('API_LEVEL_ANDROID_15 is 35', () => {
      expect(API_LEVEL_ANDROID_15).toBe(35);
    });
  });

  describe('isAndroid12OrAbove', () => {
    it('returns true when platformApiLevel is 35 (>= 31)', () => {
      expect(isAndroid12OrAbove()).toBe(true);
    });
  });

  describe('isAndroid13OrAbove', () => {
    it('returns true on API 35', () => {
      expect(isAndroid13OrAbove()).toBe(true);
    });
  });

  describe('isAndroid15OrAbove', () => {
    it('returns true on API 35', () => {
      expect(isAndroid15OrAbove()).toBe(true);
    });
  });

  describe('needsExactAlarmPermission (via service)', () => {
    it('returns true on API 35 (>= API 31)', async () => {
      const result = await localRemindersService.needsExactAlarmPermission();
      expect(result).toBe(true);
    });
  });
});

// =============================================================================
// 5. routesToMinimize — correct root screen names
// =============================================================================

describe('ROUTES_TO_MINIMIZE', () => {
  it('is a Set', () => {
    expect(ROUTES_TO_MINIMIZE).toBeInstanceOf(Set);
  });

  it('contains Login', () => {
    expect(ROUTES_TO_MINIMIZE.has('Login')).toBe(true);
  });

  it('contains PreRegister', () => {
    expect(ROUTES_TO_MINIMIZE.has('PreRegister')).toBe(true);
  });

  it('contains Register', () => {
    expect(ROUTES_TO_MINIMIZE.has('Register')).toBe(true);
  });

  it('contains Home', () => {
    expect(ROUTES_TO_MINIMIZE.has('Home')).toBe(true);
  });

  it('contains Otp', () => {
    expect(ROUTES_TO_MINIMIZE.has('Otp')).toBe(true);
  });

  it('contains Measurement (register tab)', () => {
    expect(ROUTES_TO_MINIMIZE.has('Measurement')).toBe(true);
  });

  it('does NOT contain inner screens', () => {
    expect(ROUTES_TO_MINIMIZE.has('Historical')).toBe(false);
    expect(ROUTES_TO_MINIMIZE.has('Profile')).toBe(false);
    expect(ROUTES_TO_MINIMIZE.has('MeasurementDetail')).toBe(false);
    expect(ROUTES_TO_MINIMIZE.has('RegisterMeasurement')).toBe(false);
    expect(ROUTES_TO_MINIMIZE.has('Achievement')).toBe(false);
    expect(ROUTES_TO_MINIMIZE.has('PersonalInfo')).toBe(false);
  });
});

// =============================================================================
// 6. minimizeApp — calls native module or fallback
// =============================================================================

describe('minimizeApp', () => {
  it('calls NativeModules.AppMinimize.minimize() when module is present', () => {
    // Native module is present (set in beforeEach)
    minimizeApp();

    expect(RNMock.NativeModules.AppMinimize?.minimize).toHaveBeenCalledTimes(1);
    expect(RNMock.BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it('falls back to BackHandler.exitApp() when NativeModules.AppMinimize is absent', () => {
    // Remove the native module
    delete RNMock.NativeModules.AppMinimize;

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { minimizeApp: minimizeAppFresh } = require('@/native/minimize/useAppMinimize') as {
        minimizeApp: () => void;
      };
      minimizeAppFresh();
    });

    expect(RNMock.BackHandler.exitApp).toHaveBeenCalledTimes(1);
  });

  it('does nothing on non-Android platform', () => {
    RNMock.Platform.OS = 'ios';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { minimizeApp: minimizeAppFresh } = require('@/native/minimize/useAppMinimize') as {
        minimizeApp: () => void;
      };
      minimizeAppFresh();
    });

    expect(RNMock.NativeModules.AppMinimize?.minimize).not.toHaveBeenCalled();
    expect(RNMock.BackHandler.exitApp).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 7. setEnableNotifications — wires to schedule or cancel
// =============================================================================

describe('setEnableNotifications', () => {
  it('calls cancelAllNotifications when enable=false (R-48 fix applied)', async () => {
    const cancelSpy = jest
      .spyOn(localRemindersService, 'cancelAllNotifications')
      .mockResolvedValue();

    await localRemindersService.setEnableNotifications(false);

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    cancelSpy.mockRestore();
  });

  it('calls scheduleDailyNotifications when enable=true', async () => {
    PreferencesMock.get.mockResolvedValue({ value: null });

    const scheduleSpy = jest
      .spyOn(localRemindersService, 'scheduleDailyNotifications')
      .mockResolvedValue();

    await localRemindersService.setEnableNotifications(true);

    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    scheduleSpy.mockRestore();
  });

  it('persists enable=true to NOTIFICATION_PERMISSION_KEY', async () => {
    jest
      .spyOn(localRemindersService, 'scheduleDailyNotifications')
      .mockResolvedValue();

    await localRemindersService.setEnableNotifications(true);

    expect(PreferencesMock.set).toHaveBeenCalledWith({
      key: 'notificationPermissionGrantedUser',
      value: JSON.stringify({ enableNotifications: true }),
    });
  });

  it('persists enable=false to NOTIFICATION_PERMISSION_KEY', async () => {
    jest
      .spyOn(localRemindersService, 'cancelAllNotifications')
      .mockResolvedValue();

    await localRemindersService.setEnableNotifications(false);

    expect(PreferencesMock.set).toHaveBeenCalledWith({
      key: 'notificationPermissionGrantedUser',
      value: JSON.stringify({ enableNotifications: false }),
    });
  });
});
