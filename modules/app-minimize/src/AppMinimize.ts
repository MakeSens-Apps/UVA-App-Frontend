import { NativeModules, Platform } from 'react-native';

/**
 * Moves the current task to background (Android only).
 * Wraps Activity.moveTaskToBack(true) via the AppMinimize native module.
 *
 * On iOS/web: no-op (no minimize concept on those platforms).
 */
export function minimizeApp(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  const mod = NativeModules.AppMinimize as
    | { minimize?: () => void }
    | undefined;
  if (mod?.minimize) {
    mod.minimize();
  }
}
