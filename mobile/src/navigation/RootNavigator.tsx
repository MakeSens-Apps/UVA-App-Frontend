/**
 * B12 — RootNavigator (conditional by auth state)
 *
 * Top-level navigator wrapped in NavigationContainer.
 * Decides Auth vs App stack based on useAuthGate() result.
 *
 * Decision flow (mirrors original checkUserAuthentication):
 *  - destination === null → show SplashScreen (auth check in progress)
 *  - destination === 'login' → Auth stack (Login as initial route)
 *  - destination === 'validate-project' → Auth stack (ProjectVinculation as initial route)
 *  - destination === 'app' → App stack
 *
 * Navigation tracking:
 *  - onStateChange fires on every route change
 *  - __getCurrentRoute helper (mirrors initializeNavigationTracking pattern from original)
 *  - No window.location — pure React Navigation state (R-30)
 *
 * Portability matrix: Sistema de rutas/navegación → B12
 * Risks: R-15, R-43, R-30, R-04, R-12, R-41, R-23
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreenExpo from 'expo-splash-screen';

import type { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { SplashScreen } from '@/screens/splash/SplashScreen';
import { useAuthGate } from './useAuthGate';
import type { AuthGateDestination } from './useAuthGate';
import { registerDevBypassSetter } from './devBypass';

const Root = createNativeStackNavigator<RootStackParamList>();

// ─── Navigation tracking (mirrors initializeNavigationTracking) ───────────────

/**
 * Returns the current active route name from the navigation state.
 * Replaces window.location-based tracking (R-30, no DOM in RN).
 * Equivalent to the original initializeNavigationTracking urlProvider callback.
 */
export function getCurrentRoute(
  ref: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
): string | undefined {
  return ref.current?.getCurrentRoute()?.name;
}

// ─── RootNavigator ─────────────────────────────────────────────────────────────

export function RootNavigator(): React.JSX.Element {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  // destination is lifted from SplashScreen's useAuthGate via onAuthResolved callback.
  // null = splash still showing; non-null = navigate to the resolved stack.
  // DEV_GATE: skip splash+auth, go straight to App stack for B08-B12 gate testing.
  const [destination, setDestination] = useState<AuthGateDestination | null>(
    __DEV__ ? 'app' : null,
  );

  // When DEV_GATE skips SplashScreen, hide the native splash manually.
  useEffect(() => {
    if (__DEV__) {
      void SplashScreenExpo.hideAsync().catch(() => {});
    }
  }, []);

  // Register bypass setter (used by DEV button in LoginScreen)
  useEffect(() => {
    registerDevBypassSetter(setDestination);
    return () => { registerDevBypassSetter(null); };
  }, [setDestination]);

  // ─── onReady: capture initial route name ─────────────────────────────────

  const handleReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  }, []);

  // ─── onStateChange: track navigation (no window.location) ────────────────

  const handleStateChange = useCallback(() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName) {
      // Analytics/Pinpoint tracking hook (R-30: no window.location)
      // TODO (B19): wire to AWS Pinpoint recordEvent here
      // console.log('Navigation:', previousRouteName, '→', currentRouteName);
    }

    routeNameRef.current = currentRouteName;
  }, []);

  // ─── Splash → destination transition ─────────────────────────────────────

  const handleAuthResolved = useCallback(
    (dest: 'login' | 'app' | 'validate-project') => {
      // SplashScreen fires this after both animation + auth are complete.
      // Setting destination here triggers RootNavigator to swap to Auth/App stack.
      setDestination(dest);
    },
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  // While checking auth, render SplashScreen outside of NavigationContainer
  if (destination === null) {
    return (
      <SplashScreen
        onAuthResolved={handleAuthResolved}
      />
    );
  }

  return (
    <NavigationContainer
      key={destination}
      ref={navigationRef}
      onReady={handleReady}
      onStateChange={handleStateChange}
    >
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {destination === 'app' ? (
          <Root.Screen name="App" component={AppStack} />
        ) : (
          <Root.Screen
            name="Auth"
            component={AuthStack}
            initialParams={
              destination === 'validate-project'
                ? { initialRoute: 'ProjectVinculation' }
                : undefined
            }
          />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}

// ─── Re-export helpers ────────────────────────────────────────────────────────

export { useAuthGate };
export default RootNavigator;
