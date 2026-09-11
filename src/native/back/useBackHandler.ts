/**
 * B17 — useBackHandler
 *
 * Ported from: AppMinimizeService.initializeBackButtonHandler()
 * Classification: Rewrite (Angular service → React hook)
 *
 * Replaces:
 *   this.platform.backButton.subscribeWithPriority(10, ...) → BackHandler.addEventListener
 *   window.history.back() → return false (React Navigation's own BackHandler pops)
 *   App.minimizeApp() (Capacitor, not available in RN) → NativeModules.AppMinimize or
 *     BackHandler.exitApp() fallback with deviation documented below.
 *
 * IMPORTANT — Back behavior:
 *   - Screen name IS in ROUTES_TO_MINIMIZE → call minimizeApp() (moves app to background)
 *     and return true (consume the event, nothing navigates).
 *   - Screen name NOT in ROUTES_TO_MINIMIZE → return false so React Navigation's own
 *     back handler performs the goBack (equivalent to window.history.back()).
 *
 * DEVICE BUG (Redmi Note 10S / Android 13) — root cause of "back on Home shows a
 * register screen":
 *   This hook used to read the route via useNavigationState(), which requires a
 *   navigation context, so it could only be called from inside a screen. As a result
 *   it was NEVER mounted anywhere in the app (dead code) and the hardware back button
 *   fell through to Android's default behavior (the Activity is finished; on relaunch
 *   the splash → auth gate can land the user back in the Auth/register stack).
 *
 *   The original Ionic app registers the handler ONCE, globally, in AppComponent's
 *   constructor (app.component.ts → appMinimizeService.initializeBackButtonHandler()).
 *   To reproduce that, the hook now takes a route-name getter instead of relying on a
 *   navigation context, so RootNavigator can mount it once for BOTH stacks using the
 *   NavigationContainer ref (see RootNavigator.tsx). The container ref's
 *   getCurrentRoute() already resolves the focused LEAF route across nested navigators
 *   (Root → App → AppTabs → HomeStack → Home), which the previous hand-rolled state
 *   walk did not do reliably.
 *
 * MINIMIZE STRATEGY (decision per plan.md B17, pregunta abierta #7):
 *   React Native's BackHandler.exitApp() CLOSES the app (not minimizes).
 *   True minimize requires moveTaskToBack(true) via a native Android module
 *   (mobile/modules/app-minimize/ — see useAppMinimize.ts).
 *
 * Portability matrix: app-minimize.service.ts → useBackHandler
 * Risks: R-14, R-07
 */

import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import type { NavigationState, PartialState } from '@react-navigation/native';

import { ROUTES_TO_MINIMIZE } from '@/native/minimize/routesToMinimize';
import { minimizeApp } from '@/native/minimize/useAppMinimize';

type AnyNavState = NavigationState | PartialState<NavigationState> | undefined;

/**
 * Resolves the focused LEAF route name from a (possibly nested) navigation state.
 *
 * Mirrors React Navigation's findFocusedRoute: descends through every nested
 * navigator until it reaches a route without its own state.
 *
 * Root → 'App' → 'AppTabs' → 'HomeStack' → 'Home'  ⇒ returns 'Home'
 *
 * Exported for tests and for callers that only have a raw state object.
 */
export function resolveLeafRouteName(state: AnyNavState): string {
  let current = state;
  let name = '';

  while (current && current.routes && current.routes.length > 0) {
    const index = current.index ?? current.routes.length - 1;
    const route = current.routes[index];
    if (!route) break;
    name = route.name;
    current = route.state as AnyNavState;
  }

  return name;
}

/**
 * Decides what the hardware back button should do for a given leaf route name.
 *
 * @returns true when the event was consumed (app minimized), false to let
 *          React Navigation handle the back navigation.
 */
export function handleHardwareBackPress(currentRouteName: string): boolean {
  if (ROUTES_TO_MINIMIZE.has(currentRouteName)) {
    // Root screen → minimize (move to background), never navigate.
    minimizeApp();
    return true; // consume the event
  }
  // Inner screen → let React Navigation's own BackHandler perform goBack().
  return false;
}

/**
 * Registers the global hardware back button handler (Android).
 *
 * Mount ONCE, as high in the tree as possible (RootNavigator), mirroring the
 * original's single registration in AppComponent.
 *
 * @param getCurrentRouteName - returns the currently focused LEAF route name.
 *        Pass a stable callback (useCallback) — the listener is re-registered
 *        whenever this identity changes.
 * @param resubscribeKey - opaque value; when it changes the listener is removed and
 *        re-added. RN's BackHandler is LIFO (the LAST registered handler runs FIRST),
 *        and React Navigation's NavigationContainer registers its own handler on mount.
 *        Passing the gate `destination` here re-registers ours AFTER the container
 *        remounts, so a root route always minimizes instead of React Navigation
 *        silently switching tabs (e.g. back on the 'Measurement' tab).
 *
 * Usage:
 *   const getRoute = useCallback(
 *     () => navigationRef.current?.getCurrentRoute()?.name ?? '',
 *     [],
 *   );
 *   useBackHandler(getRoute, destination);
 */
export function useBackHandler(
  getCurrentRouteName: () => string,
  resubscribeKey?: unknown,
): void {
  useEffect(() => {
    const handler = (): boolean =>
      handleHardwareBackPress(getCurrentRouteName());

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handler,
    );
    return () => subscription.remove();
  }, [getCurrentRouteName, resubscribeKey]);
}

export default useBackHandler;
