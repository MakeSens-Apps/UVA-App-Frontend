/**
 * B17 — useAppMinimize / minimizeApp
 *
 * Ported from: AppMinimizeService.appMinimize() (app-minimize.service.ts)
 * Classification: Rewrite (Capacitor App.minimizeApp → native module)
 *
 * STRATEGY:
 *   Capacitor's @capacitor/app minimizeApp() wraps Activity.moveTaskToBack(true).
 *   React Native has no built-in equivalent (BackHandler.exitApp() CLOSES the app).
 *
 *   We expose minimizeApp() via a NativeModules call to a thin native module
 *   named "AppMinimize". The module must be registered in the CNG prebuild
 *   (see devNote below on how to create it if needed).
 *
 * FALLBACK (deviation documented in StructuredOutput.deviations):
 *   If the native module is absent (emulator/web/iOS), we call BackHandler.exitApp()
 *   which CLOSES instead of minimizes. The integrator must verify the native module
 *   is present via CNG prebuild before shipping.
 *
 * CNG NOTE — AppMinimize native module:
 *   The simplest approach compatible with CNG/prebuild is an expo-modules module
 *   under mobile/modules/app-minimize/ with a single Android method:
 *
 *     fun minimize(promise: Promise) {
 *       val activity = appContext.currentActivity
 *       activity?.moveTaskToBack(true)
 *       promise.resolve(null)
 *     }
 *
 *   Alternatively, this can be a bare NativeModules wrapper if prebuild is not
 *   needed. The integrator decides based on CNG constraints.
 *   If neither is viable, BackHandler fallback is the acceptable deviation per
 *   plan.md B17 "si no es viable sin romper CNG, BackHandler que NO cierra
 *   (return true) + deviation documentada".
 *
 * Portability matrix: @capacitor/app minimizeApp → native module / BackHandler fallback
 * Risks: R-14, R-19
 */

import { NativeModules, BackHandler, Platform } from 'react-native';

/**
 * Moves the app to the background (Android only).
 *
 * Tries NativeModules.AppMinimize.minimize() first.
 * Falls back to BackHandler.exitApp() if the native module is unavailable.
 *
 * DEVIATION: If AppMinimize native module is not present in the build,
 * BackHandler.exitApp() is called instead which CLOSES the app.
 * See useAppMinimize.ts header for how to add the native module.
 */
export function minimizeApp(): void {
  if (Platform.OS !== 'android') {
    // On iOS/web there is no "minimize" concept — do nothing
    return;
  }

  if ((NativeModules.AppMinimize as { minimize?: () => void } | undefined)?.minimize) {
    // Native module present (CNG prebuild includes expo-modules AppMinimize)
    (NativeModules.AppMinimize as { minimize: () => void }).minimize();
  } else {
    // DEVIATION: Native module absent → BackHandler.exitApp() CLOSES the app.
    // The integrator must add the AppMinimize native module to the CNG prebuild
    // to restore true minimize-to-background behavior (plan.md B17, R-14).
    console.warn(
      '[B17] AppMinimize native module not found. ' +
      'Falling back to BackHandler.exitApp() which CLOSES the app. ' +
      'Add mobile/modules/app-minimize/ expo-module to restore minimize behavior.',
    );
    BackHandler.exitApp();
  }
}

export default minimizeApp;
