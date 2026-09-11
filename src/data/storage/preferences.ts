/**
 * B05 — Preferences (AsyncStorage wrapper)
 * Ported from: @capacitor/preferences usages in register-measurement.page.ts
 *              and notification.service.ts
 * Classification: Major adaptation (@capacitor/preferences → AsyncStorage)
 *
 * Preserves ALL key names exactly as used in the original (R-09):
 *   - 'lastMeasurementValues'  (register-measurement.page.ts)
 *   - 'notificationPermissionGrantedUser'  (notification.service.ts)
 *   - 'notificationPermissionProgrammed'  (notification.service.ts)
 *
 * API mirrors @capacitor/preferences for drop-in replacement at call sites:
 *   get(options: {key: string}): Promise<{value: string | null}>
 *   set(options: {key: string, value: string}): Promise<void>
 *   remove(options: {key: string}): Promise<void>
 *   clear(): Promise<void>
 *
 * Note: This module is intentionally NOT a global clear() — callers that used
 *       Preferences.clear() should be migrated to clear each key explicitly.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Well-known Preferences keys (all call sites from the original codebase)
// ---------------------------------------------------------------------------

/** Key used by RegisterMeasurementPage to persist the last measurement values. */
export const LAST_MEASUREMENT_VALUES_KEY = 'lastMeasurementValues';

/** Key used by LocalRemindersService (B17) to track notification grant state. */
export const NOTIFICATION_PERMISSION_KEY = 'notificationPermissionGrantedUser';

/** Key used by LocalRemindersService (B17) to track if notifications are programmed. */
export const NOTIFICATION_PROGRAMMED_KEY = 'notificationPermissionProgrammed';

// ---------------------------------------------------------------------------
// Capacitor-compatible API shim
// ---------------------------------------------------------------------------

export const Preferences = {
  /**
   * Get a value by key.
   * @returns {Promise<{value: string | null}>} — matches @capacitor/preferences return shape.
   */
  async get(options: { key: string }): Promise<{ value: string | null }> {
    const value = await AsyncStorage.getItem(options.key);
    return { value };
  },

  /**
   * Set a value by key.
   */
  async set(options: { key: string; value: string }): Promise<void> {
    await AsyncStorage.setItem(options.key, options.value);
  },

  /**
   * Remove a value by key.
   */
  async remove(options: { key: string }): Promise<void> {
    await AsyncStorage.removeItem(options.key);
  },

  /**
   * Clear all AsyncStorage keys.
   * WARNING: This wipes all AsyncStorage data including Amplify tokens.
   * Prefer key-by-key removal (R-37).
   */
  async clear(): Promise<void> {
    await AsyncStorage.clear();
  },
};
