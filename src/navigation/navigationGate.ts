/**
 * Navigation gate — cross-stack transition mechanism.
 *
 * WHY THIS EXISTS (root-cause of the "frozen RegisterCompleted" bug):
 *   RootNavigator mounts the Auth stack OR the App stack *conditionally*, based on
 *   the `destination` gate state. When the user is in the Auth stack, the 'App'
 *   route is NOT mounted (and vice-versa). Therefore a screen inside the Auth stack
 *   that does `navigation.reset({ routes: [{ name: 'App' }] })` targets a route that
 *   does not exist → React Navigation silently no-ops → the screen freezes.
 *
 *   The ONLY way to switch between the Auth and App stacks is to flip the gate's
 *   `destination` state (which re-mounts the correct stack). This module exposes
 *   that mechanism cleanly to any screen, replacing the broken cross-stack resets.
 *
 * DESIGN:
 *   - RootNavigator registers its `setDestination` setter here on mount.
 *   - Screens call `requestNavigateToApp()` / `requestNavigateToAuth()` (or consume
 *     the typed `useNavigationGate()` hook, which wraps these) to request a flip.
 *   - No imports from navigation modules (except the destination type) — keeps the
 *     dependency graph acyclic:
 *       RootNavigator → AuthStack → screens → navigationGate  (no back-edge)
 *
 * Original Angular parity:
 *   In the Ionic app every page lived in a single flat router, so
 *   `router.navigate(['app/tabs/home'])` from register-completed worked because the
 *   route always existed. The RN conditional-mount architecture requires this gate
 *   flip to achieve the same Auth→App transition.
 */

import type { AuthGateDestination } from './useAuthGate';

let _setter: ((d: AuthGateDestination) => void) | null = null;

/** Called by RootNavigator on mount to register its destination setter. */
export function registerGateSetter(
  setter: ((d: AuthGateDestination) => void) | null,
): void {
  _setter = setter;
}

/**
 * Flip the gate to a specific destination. Returns true if the setter was
 * registered (i.e. RootNavigator is mounted), false otherwise.
 */
export function requestNavigateTo(destination: AuthGateDestination): boolean {
  if (_setter) {
    _setter(destination);
    return true;
  }
  return false;
}

/**
 * Request the transition to the App stack (authenticated area / home).
 * Use this instead of `navigation.reset({ routes: [{ name: 'App' }] })` from
 * inside the Auth stack — that reset is a no-op because 'App' is not mounted.
 */
export function requestNavigateToApp(): boolean {
  return requestNavigateTo('app');
}

/**
 * Request the transition back to the Auth stack (login).
 * Use this instead of `navigation.reset({ routes: [{ name: 'Auth' }] })` from
 * inside the App stack (e.g. on logout / delete account) — that reset is a no-op
 * because 'Auth' is not mounted.
 */
export function requestNavigateToAuth(): boolean {
  return requestNavigateTo('login');
}

// ─── Backward-compat aliases (DEV bypass — kept for existing call sites) ────────

/** @deprecated Use registerGateSetter. Kept for backward compatibility. */
export const registerDevBypassSetter = registerGateSetter;

/** @deprecated Use requestNavigateToApp. Kept for backward compatibility. */
export function devBypassToApp(): void {
  requestNavigateToApp();
}
