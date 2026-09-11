/**
 * useNavigationGate — typed hook wrapping the navigation-gate module.
 *
 * Screens use this to request a cross-stack transition (Auth↔App) instead of
 * `navigation.reset({ routes: [{ name: 'App' | 'Auth' }] })`, which silently
 * no-ops because RootNavigator only mounts one stack at a time.
 *
 * See navigationGate.ts for the full root-cause explanation.
 */

import { useMemo } from 'react';
import { requestNavigateToApp, requestNavigateToAuth } from './navigationGate';

export interface NavigationGate {
  /**
   * Transition to the App stack (authenticated area / home).
   * Returns true if the gate accepted the request.
   */
  goToApp: () => boolean;
  /**
   * Transition back to the Auth stack (login) — e.g. on logout.
   * Returns true if the gate accepted the request.
   */
  goToAuth: () => boolean;
}

export function useNavigationGate(): NavigationGate {
  return useMemo<NavigationGate>(
    () => ({
      goToApp: requestNavigateToApp,
      goToAuth: requestNavigateToAuth,
    }),
    [],
  );
}

export default useNavigationGate;
