/**
 * DEV-only bypass — isolated module to avoid circular imports.
 *
 * RootNavigator registers a setter here; LoginScreen calls devBypassToApp()
 * to skip real authentication during gate testing.
 *
 * No imports from navigation modules — breaks the circular dependency:
 *   RootNavigator → AuthStack → LoginScreen → (was) RootNavigator
 */

import type { AuthGateDestination } from './useAuthGate';

let _setter: ((d: AuthGateDestination) => void) | null = null;

/** Called by RootNavigator on mount to register its destination setter. */
export function registerDevBypassSetter(
  setter: ((d: AuthGateDestination) => void) | null,
): void {
  _setter = setter;
}

/** Called by LoginScreen DEV button to jump directly to the App stack. */
export function devBypassToApp(): void {
  if (_setter) {
    _setter('app');
  }
}
