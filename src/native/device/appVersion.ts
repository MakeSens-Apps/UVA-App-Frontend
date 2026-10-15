/**
 * Installed app version and store link (F4-05, #60).
 *
 * The minimum-version policy is compared with the Android `versionName`
 * (decision O4 in #60), which `app.config.js` takes from `expo.version`
 * or `EXPO_APP_VERSION` at build time.
 */

import { Linking } from 'react-native';
import * as Application from 'expo-application';

/** Production package. The debug APK uses the same one (AGENTS.md). */
const FALLBACK_PACKAGE = 'com.makesens.appuva';

/** Installed `versionName` (e.g. "2.3.1"), or null if it cannot be read. */
export function getInstalledAppVersion(): string | null {
  return Application.nativeApplicationVersion ?? null;
}

/**
 * Opens the app's Play Store listing: the Play Store app if present, the web page otherwise.
 */
export async function openAppStoreListing(): Promise<void> {
  const packageName = Application.applicationId ?? FALLBACK_PACKAGE;
  try {
    await Linking.openURL(`market://details?id=${packageName}`);
  } catch {
    await Linking.openURL(
      `https://play.google.com/store/apps/details?id=${packageName}`,
    );
  }
}
