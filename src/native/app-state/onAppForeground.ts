/**
 * App foreground listener (#76).
 *
 * Thin wrapper over React Native's AppState so `src/data/` reaches the platform through
 * `src/native/`, as it does for the app version and the notifications.
 */

import { AppState } from 'react-native';

/**
 * Calls the listener each time the app comes back to the foreground.
 * @returns The unsubscribe function.
 */
export function onAppForeground(listener: () => void): () => void {
  const subscription = AppState.addEventListener('change', (next) => {
    if (next === 'active') listener();
  });
  return () => subscription.remove();
}
