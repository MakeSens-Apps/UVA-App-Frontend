/**
 * B17 — LocalRemindersService
 *
 * Ported from: src/app/services/notification/notification.service.ts
 * Classification: Rewrite required
 * Renamed: NotificationService (PUSH LOCAL) → LocalRemindersService (§4.3)
 *
 * Changes from original:
 *  - @capacitor/local-notifications → expo-notifications (R-13)
 *  - @capacitor/preferences → AsyncStorage via Preferences shim (R-09)
 *  - @capacitor/device → expo-device platformApiLevel (R-25)
 *  - BUG R-48 FIXED: cancelAllNotifications now calls
 *      cancelAllScheduledNotificationsAsync() instead of just removeAllListeners()
 *      (the original NEVER actually cancelled the scheduled alarms — §4.4 authorized fix)
 *  - DailyTriggerInput (SchedulableTriggerInputTypes.DAILY): schedule fires at the
 *      same hour:minute every day — no at: Date math needed (expo-notifications handles it)
 *  - notificationPermission* keys PRESERVED (R-09, same keys as original)
 *  - Platform.OS guard replaces Capacitor.getPlatform() (R-22)
 *  - osVersion marketing string → platformApiLevel integer (R-25)
 *    A12 = API 31, A15 = API 35
 *
 * Portability matrix: "services/notification/notification.service.ts" → LocalRemindersService
 * Risks: R-13, R-48, R-25, R-19, R-22
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as Device from 'expo-device';

import {
  Preferences,
  NOTIFICATION_PERMISSION_KEY,
  NOTIFICATION_PROGRAMMED_KEY,
} from '@/data/storage/preferences';

// ─── Constants (preserved from original) ─────────────────────────────────────

const NOTIFICATION_CHANNEL_ID = 'measurement-reminders';

/**
 * Android API level mapping (R-25):
 *   Android 12 = API level 31 (exact alarm permission required from here)
 *   Android 15 = API level 35 (Private Space restrictions)
 *
 * Original used osVersion marketing string (e.g. "12", "15") which is unreliable
 * on some OEM builds. expo-device.platformApiLevel is the authoritative integer.
 */
const API_LEVEL_ANDROID_12 = 31;
const API_LEVEL_ANDROID_15 = 35;

// ─── Interfaces (preserved from original) ────────────────────────────────────

export interface NotificationState {
  userEnabled: boolean;
  systemPermissionGranted: boolean;
  exactAlarmPermissionGranted: boolean;
  notificationsScheduled: boolean;
  lastScheduleAttempt: string;
  batteryOptimizationDisabled: boolean;
  notificationChannelCreated: boolean;
}

export interface SystemStatus {
  canSchedule: boolean;
  permissionsGranted: boolean;
  exactAlarmAvailable: boolean;
  batteryOptimized: boolean;
  issues: string[];
}

// ─── LocalRemindersService ────────────────────────────────────────────────────

/**
 * Manages daily measurement reminder notifications.
 *
 * Replaces @capacitor/local-notifications with expo-notifications.
 * R-48 BUG FIX: cancelAllScheduledNotificationsAsync() is now called on cancel
 * (the original called removeAllListeners() which only removes JS listeners —
 * the OS-level alarms were never cancelled, so notifications kept firing).
 */
class LocalRemindersService {
  constructor() {
    // Initialize notification channels on service creation (Android only)
    if (Platform.OS === 'android') {
      void this.createNotificationChannels();
    }
  }

  // ─── requestPermissions ─────────────────────────────────────────────────────

  /**
   * Requests comprehensive permissions for local notifications.
   * Required for Android 13+ (API 33+) runtime permissions.
   * @returns true if all necessary permissions are granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const current = await Notifications.getPermissionsAsync();

      if (current.status === 'granted') {
        return true;
      }

      const result = await Notifications.requestPermissionsAsync();
      const permissionGranted = result.status === 'granted';

      if (permissionGranted) {
        // Check if exact alarm permission is needed (Android 12+ / API 31+)
        const needsExactAlarm = await this.needsExactAlarmPermission();
        if (needsExactAlarm) {
          await this.requestExactAlarmPermission();
        }
        // Create notification channels for Android 8+
        await this.createNotificationChannels();
      }

      return permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // ─── scheduleDailyNotifications ──────────────────────────────────────────────

  /**
   * Schedules daily notifications at specific times (default: 6:00 AM and 6:00 PM).
   *
   * Uses DailyTriggerInput (SchedulableTriggerInputTypes.DAILY) — fires at the
   * same hour:minute every day. No at: Date math is needed; expo-notifications
   * handles the first-occurrence logic internally.
   *
   * Preserves original schedule idempotency check (programmed flag in Preferences).
   *
   * @param morningTimeHour - Hour for morning reminder (default: 6 = 6:00 AM)
   * @param afternoonTimeHour - Hour for afternoon reminder (default: 18 = 6:00 PM)
   */
  async scheduleDailyNotifications(
    morningTimeHour = 6,
    afternoonTimeHour = 18,
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.error('Permisos denegados para notificaciones.');
      return;
    }

    // Idempotency check: if already programmed, skip (preserved from original)
    const programmed = (
      await Preferences.get({ key: NOTIFICATION_PROGRAMMED_KEY })
    ).value;
    if (programmed) {
      const status = JSON.parse(programmed) as { programmed?: boolean };
      if (status.programmed) {
        console.warn('Notificaciones ya programadas.');
        return;
      }
    }

    try {
      // Morning: 6:00 AM daily
      await Notifications.scheduleNotificationAsync({
        identifier: 'morning-reminder',
        content: {
          title: 'Recordatorio de registro',
          body: '¡Es hora de registrar tus mediciones ambientales! Temperatura, humedad y lluvia te esperan.',
          // expo-notifications: `true` = the OS default sound. The string 'default'
          // is treated as a CUSTOM sound FILENAME and throws at runtime:
          // "Custom sound 'default' not found in native app".
          sound: true,
          // Android-specific
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          channelId: NOTIFICATION_CHANNEL_ID,
          hour: morningTimeHour,
          minute: 0,
        },
      });

      // Afternoon: 6:00 PM daily
      await Notifications.scheduleNotificationAsync({
        identifier: 'afternoon-reminder',
        content: {
          title: 'Recordatorio de registro',
          body: '¡Hora de registrar tus mediciones ambientales! No olvides temperatura, humedad y lluvia.',
          // `true` = OS default sound (see morning reminder above).
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          channelId: NOTIFICATION_CHANNEL_ID,
          hour: afternoonTimeHour,
          minute: 0,
        },
      });

      await Preferences.set({
        key: NOTIFICATION_PROGRAMMED_KEY,
        value: JSON.stringify({ programmed: true }),
      });

      console.warn('Notificaciones programadas para las 6:00 AM y 6:00 PM.');
    } catch (error) {
      console.error('Error al programar notificaciones diarias:', error);
    }
  }

  // ─── cancelAllNotifications ── BUG R-48 FIX ─────────────────────────────────

  /**
   * Cancels all scheduled notifications.
   *
   * BUG FIX (R-48, §4.4 authorized):
   *   The original only called LocalNotifications.removeAllListeners() which removes
   *   JS-side listeners but does NOT cancel the OS-level alarms. This meant notifications
   *   kept firing after the user "disabled" them — a UX/reliability defect.
   *
   *   This implementation calls cancelAllScheduledNotificationsAsync() which actually
   *   cancels the pending OS alarms.
   */
  async cancelAllNotifications(): Promise<void> {
    // R-48 FIX: cancelAllScheduledNotificationsAsync cancels the actual OS-level alarms
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Preferences.remove({ key: NOTIFICATION_PROGRAMMED_KEY });
    console.warn('Todas las notificaciones han sido canceladas.');
  }

  // ─── getEnableNotifications ───────────────────────────────────────────────────

  /**
   * Returns the user's notification enable status from Preferences.
   * Key preserved: 'notificationPermissionGrantedUser' (R-09).
   */
  async getEnableNotifications(): Promise<boolean> {
    const ret = await Preferences.get({ key: NOTIFICATION_PERMISSION_KEY });
    if (ret.value) {
      const status = JSON.parse(ret.value) as { enableNotifications?: boolean };
      return status.enableNotifications ?? false;
    }
    return false;
  }

  // ─── setEnableNotifications ───────────────────────────────────────────────────

  /**
   * Updates the user's notification enable status.
   * If disabled → cancelAllNotifications (R-48 fix takes effect here).
   * If enabled → scheduleDailyNotifications.
   * Key preserved: 'notificationPermissionGrantedUser' (R-09).
   */
  async setEnableNotifications(enable: boolean): Promise<void> {
    await Preferences.set({
      key: NOTIFICATION_PERMISSION_KEY,
      value: JSON.stringify({ enableNotifications: enable }),
    });
    if (!enable) {
      await this.cancelAllNotifications();
    } else {
      await this.scheduleDailyNotifications();
    }
  }

  // ─── createNotificationChannels ───────────────────────────────────────────────

  /**
   * Creates notification channels for Android 8+ devices (API 26+).
   * Channel importance 4 = HIGH (preserved from original).
   * Uses AndroidImportance.HIGH (= 6 in expo enum) which maps to IMPORTANCE_HIGH in Android.
   *
   * Note: The original used numeric 4 for Capacitor's importance scale.
   * expo-notifications uses AndroidImportance enum where HIGH = 6 (matching Android's
   * IMPORTANCE_HIGH which is the equivalent of Capacitor's 4 on the Capacitor scale).
   */
  async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Recordatorios de Medición',
        importance: AndroidImportance.HIGH,
        // Channel sound: OMITTED on purpose = Android's DEFAULT_NOTIFICATION_URI.
        // Passing the string 'default' made NotificationChannelManagerModule look for
        // a bundled sound asset named "default" and log
        // "Custom sound 'default' not found in native app".
        // NOTE: `sound: null` is NOT equivalent — for a channel it means "no sound"
        // (AndroidXNotificationsChannelManager.createSoundUriFromArguments), which
        // would silently disable the reminder tone. Omitting the key keeps the
        // original behavior (audible default sound).
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#488AFF',
        enableLights: true,
        enableVibrate: true,
        description:
          'Recordatorios diarios para registrar mediciones ambientales',
      });
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  // ─── needsExactAlarmPermission ────────────────────────────────────────────────

  /**
   * Checks if exact alarm permission is needed.
   * Requires API 31+ (Android 12+) — R-25 mapping.
   *
   * Original used: parseInt(deviceInfo.osVersion) >= 12  (marketing version)
   * Fixed:         platformApiLevel >= 31                 (authoritative API level)
   */
  async needsExactAlarmPermission(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }
      const apiLevel = Device.platformApiLevel;
      // API 31 = Android 12 (where SCHEDULE_EXACT_ALARM was introduced)
      return apiLevel !== null && apiLevel >= API_LEVEL_ANDROID_12;
    } catch (error) {
      console.error('Error checking Android API level:', error);
      return false;
    }
  }

  // ─── requestExactAlarmPermission ─────────────────────────────────────────────

  /**
   * Requests exact alarm permission for Android 12+ (API 31+).
   * Full implementation (opening settings) is deferred to B18 ConfigurationPage
   * which has the UI context. This service only signals readiness.
   */
  async requestExactAlarmPermission(): Promise<boolean> {
    // The app.json declares USE_EXACT_ALARM and SCHEDULE_EXACT_ALARM permissions.
    // On API 31-32, SCHEDULE_EXACT_ALARM requires user consent (Settings page).
    // On API 33+, USE_EXACT_ALARM grants it unconditionally (if declared).
    // Full diagnostic UI is in B18 ConfigurationPage.
    return true;
  }

  // ─── getSystemStatus ──────────────────────────────────────────────────────────

  /**
   * Gets comprehensive notification system status for ConfigurationPage (B18).
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const issues: string[] = [];
    let canSchedule = true;
    let permissionsGranted = false;
    let exactAlarmAvailable = true;
    let batteryOptimized = false;

    try {
      const permissions = await Notifications.getPermissionsAsync();
      permissionsGranted = permissions.status === 'granted';

      if (!permissionsGranted) {
        issues.push('Permisos de notificación no otorgados');
        canSchedule = false;
      }

      const needsExactAlarm = await this.needsExactAlarmPermission();
      if (needsExactAlarm) {
        // B18 ConfigurationPage will check actual exact-alarm permission via native module
        exactAlarmAvailable = true;
      }

      batteryOptimized = await this.isBatteryOptimized();
      if (batteryOptimized) {
        issues.push('Optimización de batería habilitada');
      }
    } catch (error) {
      console.error('Error getting system status:', error);
      issues.push('Error verificando estado del sistema');
      canSchedule = false;
    }

    return {
      canSchedule,
      permissionsGranted,
      exactAlarmAvailable,
      batteryOptimized,
      issues,
    };
  }

  // ─── isBatteryOptimized ───────────────────────────────────────────────────────

  /**
   * Checks if the app is being battery optimized.
   * Full native check deferred to B18 (requires native module / config plugin).
   * Returns false as conservative default.
   */
  async isBatteryOptimized(): Promise<boolean> {
    // Native check for REQUEST_IGNORE_BATTERY_OPTIMIZATIONS requires
    // a config plugin or native module — deferred to B18.
    return false;
  }

  // ─── showPrivateSpaceGuidance ─────────────────────────────────────────────────

  /**
   * Shows guidance for Android 15+ (API 35+) Private Space limitations.
   * R-25: uses platformApiLevel (authoritative) instead of marketing version.
   */
  async showPrivateSpaceGuidance(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const apiLevel = Device.platformApiLevel;
        if (apiLevel !== null && apiLevel >= API_LEVEL_ANDROID_15) {
          // UI guidance for Private Space shown in B18 ConfigurationPage
          console.warn(
            'Android 15+: Private Space may affect notification delivery.',
          );
        }
      }
    } catch (error) {
      console.error('Error showing Private Space guidance:', error);
    }
  }

  // ─── getComprehensiveNotificationState ────────────────────────────────────────

  /**
   * Gets comprehensive notification state for ConfigurationPage UI (B18).
   */
  async getComprehensiveNotificationState(): Promise<NotificationState> {
    const userEnabled = await this.getEnableNotifications();
    const systemStatus = await this.getSystemStatus();

    const programmed = await Preferences.get({
      key: NOTIFICATION_PROGRAMMED_KEY,
    });
    let notificationsScheduled = false;
    if (programmed.value) {
      const status = JSON.parse(programmed.value) as { programmed?: boolean };
      notificationsScheduled = status.programmed ?? false;
    }

    return {
      userEnabled,
      systemPermissionGranted: systemStatus.permissionsGranted,
      exactAlarmPermissionGranted: systemStatus.exactAlarmAvailable,
      notificationsScheduled,
      lastScheduleAttempt: new Date().toISOString(),
      batteryOptimizationDisabled: !systemStatus.batteryOptimized,
      notificationChannelCreated: true,
    };
  }

  // ─── getNextReminderTimes ─────────────────────────────────────────────────────

  /**
   * Pure helper: given the current time, returns the next Date for each reminder hour.
   * If now is PAST the target hour for today, advance to tomorrow.
   *
   * This logic mirrors the original at: morningTime / afternoonTime calculation
   * (lines 119-140 in original) but as a pure function for testability.
   *
   * @param now - current Date (injected for testability)
   * @param morningHour - default 6
   * @param afternoonHour - default 18
   */
  getNextReminderTimes(
    now: Date,
    morningHour = 6,
    afternoonHour = 18,
  ): { morning: Date; afternoon: Date } {
    const morning = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      morningHour,
      0,
      0,
    );
    if (now >= morning) {
      morning.setDate(morning.getDate() + 1);
    }

    const afternoon = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      afternoonHour,
      0,
      0,
    );
    if (now >= afternoon) {
      afternoon.setDate(afternoon.getDate() + 1);
    }

    return { morning, afternoon };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const localRemindersService = new LocalRemindersService();
export default localRemindersService;
