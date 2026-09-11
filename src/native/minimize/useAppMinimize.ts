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

type MinimizeFn = () => unknown;
type NativeMinimizeModule = { minimize?: MinimizeFn };
type ExpoModuleLookup = (name: string) => NativeMinimizeModule | null;

/**
 * Picks the native minimize implementation, preferring the Expo module registry.
 *
 * DEVICE BUG: Expo SDK 56 / RN 0.85 run the New Architecture (bridgeless). A module
 * declared with expo-modules' `ModuleDefinition { Name("AppMinimize") }` — which is
 * what mobile/modules/app-minimize/ does — is registered in the EXPO registry, NOT in
 * RN's `NativeModules`. Looking only at `NativeModules.AppMinimize` therefore resolves
 * to undefined on device and silently degrades to `BackHandler.exitApp()`, which
 * CLOSES the app instead of minimizing it (matching the reported symptom: after back,
 * relaunching drops the user into the auth/register flow).
 *
 * Exported for tests — pure, no module-level side effects.
 *
 * @returns the callable minimize function, or null when no native module exists.
 */
export function resolveMinimizeFn(
  expoLookup: ExpoModuleLookup | null,
  bridgeModules: { AppMinimize?: NativeMinimizeModule } | undefined,
): MinimizeFn | null {
  if (expoLookup) {
    try {
      const expoMod = expoLookup('AppMinimize');
      if (expoMod?.minimize) {
        const fn = expoMod.minimize;
        return () => fn.call(expoMod);
      }
    } catch {
      // Expo registry unavailable → fall through to the bridge registry.
    }
  }

  const bridgeMod = bridgeModules?.AppMinimize;
  if (bridgeMod?.minimize) {
    const fn = bridgeMod.minimize;
    return () => fn.call(bridgeMod);
  }

  return null;
}

/** Lazily resolves expo-modules-core's optional lookup (absent in some test envs). */
function getExpoModuleLookup(): ExpoModuleLookup | null {
  try {
    const core = require('expo-modules-core') as {
      requireOptionalNativeModule?: ExpoModuleLookup;
    };
    return core.requireOptionalNativeModule ?? null;
  } catch {
    return null;
  }
}

/**
 * Moves the app to the background (Android only).
 *
 * Uses the expo-modules AppMinimize local module (mobile/modules/app-minimize/),
 * resolved from the Expo registry first and from NativeModules second.
 * Falls back to BackHandler.exitApp() if the native module is unavailable.
 */
export function minimizeApp(): void {
  if (Platform.OS !== 'android') {
    // On iOS/web there is no "minimize" concept — do nothing.
    return;
  }

  const minimize = resolveMinimizeFn(
    getExpoModuleLookup(),
    NativeModules as { AppMinimize?: NativeMinimizeModule } | undefined,
  );

  if (minimize) {
    // Native module present (CNG prebuild from mobile/modules/app-minimize/).
    void minimize();
    return;
  }

  // FALLBACK: Native module absent → BackHandler.exitApp() CLOSES the app.
  // Ensure mobile/modules/app-minimize/ is included in the prebuild.
  console.warn(
    '[B18] AppMinimize native module not found. ' +
      'Falling back to BackHandler.exitApp() which CLOSES the app. ' +
      'Ensure mobile/modules/app-minimize/ is included in the prebuild.',
  );
  BackHandler.exitApp();
}

export default minimizeApp;
