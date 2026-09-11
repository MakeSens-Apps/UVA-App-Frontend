/**
 * B17 — Android API level utilities
 *
 * Ported from: notification.service.ts osVersion comparisons
 * Classification: Minor adaptation
 *
 * R-25: Re-maps Android version comparisons to API levels.
 *
 * The original used parseInt(deviceInfo.osVersion) which gives the Android
 * marketing version (e.g. 12, 15). This is unreliable on some OEM builds
 * where osVersion may include extra characters or use different schemes.
 *
 * expo-device.platformApiLevel gives the authoritative integer API level:
 *   Android 12  → API 31 (where SCHEDULE_EXACT_ALARM was introduced)
 *   Android 12L → API 32
 *   Android 13  → API 33 (where POST_NOTIFICATIONS runtime permission required)
 *   Android 14  → API 34
 *   Android 15  → API 35 (Private Space restrictions)
 *
 * Platform.Version on Android is also the API level integer (same as platformApiLevel),
 * but expo-device is preferred for consistency and better null-safety.
 *
 * Portability matrix: @capacitor/device osVersion → expo-device platformApiLevel
 * Risks: R-25
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';

// ─── API level constants ──────────────────────────────────────────────────────

/** API 31 — Android 12: SCHEDULE_EXACT_ALARM permission introduced */
export const API_LEVEL_ANDROID_12 = 31;

/** API 32 — Android 12L */
export const API_LEVEL_ANDROID_12L = 32;

/** API 33 — Android 13: POST_NOTIFICATIONS runtime permission required */
export const API_LEVEL_ANDROID_13 = 33;

/** API 34 — Android 14 */
export const API_LEVEL_ANDROID_14 = 34;

/** API 35 — Android 15: Private Space restrictions */
export const API_LEVEL_ANDROID_15 = 35;

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Returns the current Android API level.
 * Uses expo-device.platformApiLevel (authoritative).
 * Falls back to Platform.Version on Android (same value, integer).
 * Returns null on non-Android platforms.
 *
 * @example
 * const level = getAndroidApiLevel();
 * if (level !== null && level >= API_LEVEL_ANDROID_12) { ... }
 */
export function getAndroidApiLevel(): number | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  // expo-device.platformApiLevel is null on non-Android; safe to use
  if (Device.platformApiLevel !== null) {
    return Device.platformApiLevel;
  }
  // Fallback: Platform.Version on Android is the API level integer
  if (typeof Platform.Version === 'number') {
    return Platform.Version;
  }
  return null;
}

/**
 * Returns true if the current device runs Android 12+ (API 31+).
 * Used to gate exact alarm permission flow.
 */
export function isAndroid12OrAbove(): boolean {
  const level = getAndroidApiLevel();
  return level !== null && level >= API_LEVEL_ANDROID_12;
}

/**
 * Returns true if the current device runs Android 13+ (API 33+).
 * Used to gate POST_NOTIFICATIONS runtime permission flow.
 */
export function isAndroid13OrAbove(): boolean {
  const level = getAndroidApiLevel();
  return level !== null && level >= API_LEVEL_ANDROID_13;
}

/**
 * Returns true if the current device runs Android 15+ (API 35+).
 * Used to gate Private Space guidance.
 */
export function isAndroid15OrAbove(): boolean {
  const level = getAndroidApiLevel();
  return level !== null && level >= API_LEVEL_ANDROID_15;
}
