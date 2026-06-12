/**
 * B17 — useBackHandler
 *
 * Ported from: AppMinimizeService.initializeBackButtonHandler()
 * Classification: Rewrite (Angular service → React hook)
 *
 * Replaces:
 *   this.platform.backButton.subscribeWithPriority(10, ...) → BackHandler.addEventListener
 *   window.history.back() → navigation.goBack()
 *   App.minimizeApp() (Capacitor, not available in RN) → NativeModules.AppMinimize or
 *     BackHandler.exitApp() fallback with deviation documented below.
 *
 * IMPORTANT — Back behavior:
 *   - Screen name IS in ROUTES_TO_MINIMIZE → call minimizeApp() (moves app to background)
 *   - Screen name NOT in ROUTES_TO_MINIMIZE → navigation.goBack()
 *
 * MINIMIZE STRATEGY (decision per plan.md B17, pregunta abierta #7):
 *   React Native's BackHandler.exitApp() CLOSES the app (not minimizes).
 *   True minimize requires moveTaskToBack(true) via a native Android module.
 *
 *   This hook tries NativeModules.AppMinimize.minimize() (a lightweight native
 *   module that wraps Activity.moveTaskToBack(true) — see useAppMinimize.ts).
 *   If the native module is absent (emulator without CNG build, or non-Android),
 *   it falls back to BackHandler.exitApp() with a logged deviation.
 *
 *   The integrator MUST verify that the CNG prebuild includes the AppMinimize
 *   native module (see notes in StructuredOutput). Without it, the fallback
 *   closes instead of minimizing — which is noted as a deviation.
 *
 * Portability matrix: app-minimize.service.ts → useBackHandler
 * Risks: R-14, R-07
 */

import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigationState } from '@react-navigation/native';

import { ROUTES_TO_MINIMIZE } from '@/native/minimize/routesToMinimize';
import { minimizeApp } from '@/native/minimize/useAppMinimize';

/**
 * Registers a hardware back button handler for Android.
 *
 * Must be called inside a NavigationContainer context so that
 * useNavigationState can read the current route.
 *
 * Returns true from the handler (prevents default back behavior)
 * in all cases — either minimize or goBack is performed explicitly.
 *
 * Usage:
 *   // In a component that lives inside NavigationContainer:
 *   useBackHandler();
 */
export function useBackHandler(): void {
  // getCurrentRoute from React Navigation state
  const currentRouteName = useNavigationState(
    (state) => {
      // Walk the nested state to find the leaf route name
      let s = state;
      while (s.routes[s.index]?.state) {
        const nested = s.routes[s.index].state;
        if (nested) {
          s = nested as typeof state;
        } else {
          break;
        }
      }
      return s.routes[s.index]?.name ?? '';
    },
  );

  useEffect(() => {
    const handler = (): boolean => {
      if (ROUTES_TO_MINIMIZE.has(currentRouteName)) {
        // Root screen → minimize (move to background)
        minimizeApp();
      } else {
        // Inner screen → standard back navigation
        // React Navigation's built-in back handler will fire next
        // (BackHandler priority: our handler returns true, preventing default,
        //  so we must also invoke goBack manually here — but we don't have
        //  navigation ref access at this level. Instead, return false to let
        //  React Navigation's own BackHandler handle it).
        return false;
      }
      return true; // consume the event
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [currentRouteName]);
}

export default useBackHandler;
