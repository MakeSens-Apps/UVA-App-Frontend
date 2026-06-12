/**
 * B17/B18 — useAppMinimize / minimizeApp
 *
 * Ported from: AppMinimizeService.appMinimize() (app-minimize.service.ts)
 * Classification: Rewrite (Capacitor App.minimizeApp → expo-modules native module)
 *
 * STRATEGY:
 *   Capacitor's @capacitor/app minimizeApp() wraps Activity.moveTaskToBack(true).
 *   React Native has no built-in equivalent (BackHandler.exitApp() CLOSES the app).
 *
 *   We expose minimizeApp() via the expo-modules AppMinimize local module located at
 *   mobile/modules/app-minimize/ which is auto-discovered by expo-modules autolinking
 *   (nativeModulesDir defaults to ./modules).
 *
 *   The module registers as "AppMinimize" and exposes an AsyncFunction("minimize")
 *   which calls Activity.moveTaskToBack(true). It is accessible via
 *   NativeModules.AppMinimize in the React Native bridge (legacy arch + expo bridge).
 *
 * FALLBACK:
 *   If the native module is absent (web/iOS or missing from the prebuild), we call
 *   BackHandler.exitApp() which CLOSES the app. With modules/app-minimize/ present
 *   in the CNG prebuild, this path is never reached on Android.
 *
 * Portability matrix: @capacitor/app minimizeApp → expo-modules AppMinimize (Android)
 * Risks: R-14, R-19
 */

import { NativeModules, BackHandler, Platform } from 'react-native';

/**
 * Moves the app to the background (Android only).
 *
 * Uses the expo-modules AppMinimize local module (mobile/modules/app-minimize/).
 * Access via NativeModules.AppMinimize (bridge registration by expo-modules-core).
 * Falls back to BackHandler.exitApp() if the native module is unavailable.
 */
export function minimizeApp(): void {
  if (Platform.OS !== 'android') {
    // On iOS/web there is no "minimize" concept — do nothing.
    return;
  }

  const mod = NativeModules.AppMinimize as { minimize?: () => void } | undefined;
  if (mod?.minimize) {
    // Native module present (CNG prebuild from mobile/modules/app-minimize/).
    mod.minimize();
  } else {
    // FALLBACK: Native module absent → BackHandler.exitApp() CLOSES the app.
    // Ensure mobile/modules/app-minimize/ is included in the prebuild.
    console.warn(
      '[B18] AppMinimize native module not found. ' +
        'Falling back to BackHandler.exitApp() which CLOSES the app. ' +
        'Ensure mobile/modules/app-minimize/ is included in the prebuild.',
    );
    BackHandler.exitApp();
  }
}

export default minimizeApp;
