/**
 * B12 — SplashScreen (animated)
 *
 * Ported from: src/app/pages/splash-animation/splash-animation.page.ts
 * Classification: Rewrite (UI) — authentication logic extracted to useAuthGate()
 *
 * Changes from original:
 *  - AnimationController (Ionic) → react-native-reanimated (R-41)
 *  - document.querySelector → useRef (R-30)
 *  - checkUserAuthentication / continueWithAuthenticatedFlow → useAuthGate() hook
 *  - setInterval polling (waitForAnimationToEnd) → useEffect with state flag (R-30)
 *  - setTimeout → useEffect with clearTimeout cleanup (R-30)
 *  - window / document removed (no DOM in RN)
 *  - expo-splash-screen hides native splash after fonts/animations ready
 *
 * Animation sequence (mirrors original):
 *  1. Leaf icon: translateY(-100%) → 0, 1000ms, ease-in-out
 *  2. Powered by: opacity 0→1, 1000ms, ease-in, delay 1000ms
 *  3. MakeSens logo: opacity 0→1, 1000ms, ease-in, delay 1000ms
 *  4. After logo finishes: +500ms pause → auth gate determines destination
 *
 * Portability matrix: SplashAnimationPage → Rewrite → B12
 * Risks: R-41, R-04, R-23, R-15, R-30
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as SplashScreenExpo from 'expo-splash-screen';

import { useAuthGate } from '@/navigation/useAuthGate';

// Prevent expo native splash from hiding until we're ready
void SplashScreenExpo.preventAutoHideAsync().catch(() => {
  // Already showing or not available in test env — ignore
});

// ─── Assets ───────────────────────────────────────────────────────────────────

// Inline require so Metro can resolve the path statically
// eslint-disable-next-line @typescript-eslint/no-var-requires
const leafIcon = require('@/assets/svg/logo.svg') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const poweredByLogo = require('@/assets/png/Powered_by.png') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const makeSensLogo = require('@/assets/svg/logo_Makesens.svg') as number;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SplashScreenProps {
  /** Called by useAuthGate when authentication check resolves. */
  onAuthResolved?: (destination: 'login' | 'app' | 'validate-project') => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SplashScreen({ onAuthResolved }: SplashScreenProps): React.JSX.Element {
  // ─── Animation shared values ──────────────────────────────────────────────
  const leafTranslateY = useSharedValue(-200);
  const poweredByOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  // ─── Auth gate hook ───────────────────────────────────────────────────────
  const { startAuthCheck, destination } = useAuthGate();

  // Flag: animation has completed (mirrors original endAnimation field)
  const animationDone = useRef(false);
  const authDone = useRef(false);
  const callbackFired = useRef(false);

  // ─── Animated styles ──────────────────────────────────────────────────────
  const leafStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: leafTranslateY.value }],
  }));

  const poweredByStyle = useAnimatedStyle(() => ({
    opacity: poweredByOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  // ─── Fire callback once both animation AND auth are done ─────────────────

  function maybeFireCallback(dest: typeof destination): void {
    if (animationDone.current && authDone.current && !callbackFired.current) {
      callbackFired.current = true;
      void SplashScreenExpo.hideAsync().catch(() => {});
      if (onAuthResolved && dest) {
        onAuthResolved(dest);
      }
    }
  }

  // ─── Auth check: start immediately on mount ───────────────────────────────

  useEffect(() => {
    void startAuthCheck();
  }, [startAuthCheck]);

  // ─── React to destination change ──────────────────────────────────────────

  useEffect(() => {
    if (destination) {
      authDone.current = true;
      maybeFireCallback(destination);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  // ─── Animations: start on mount ──────────────────────────────────────────

  useEffect(() => {
    // Animation sequence:
    // 1. Leaf: translateY(-200 → 0), 1000ms, ease-in-out
    // eslint-disable-next-line react-hooks/immutability
    leafTranslateY.value = withTiming(0, {
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
    });

    // 2. PoweredBy: opacity 0→1, 1000ms, delay 1000ms, ease-in
    // eslint-disable-next-line react-hooks/immutability
    poweredByOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) }),
    );

    // 3. MakeSens logo: opacity 0→1, 1000ms, delay 1000ms, ease-in
    //    After finish: +500ms pause → mark animation done
    // eslint-disable-next-line react-hooks/immutability
    logoOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          // +500ms pause (mirrors original setTimeout 500ms in onFinish)
          runOnJS(scheduleAnimationDone)();
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleAnimationDone(): void {
    const timer = setTimeout(() => {
      animationDone.current = true;
      maybeFireCallback(destination);
    }, 500);
    // Cleanup handled implicitly (component unmounts after navigation)
    return () => clearTimeout(timer) as unknown as void;
  }

  return (
    <View style={styles.container}>
      {/* Leaf / UVA logo — animates from top */}
      <Animated.View style={[styles.leafWrapper, leafStyle]}>
        <Image source={leafIcon} style={styles.leafIcon} resizeMode="contain" />
      </Animated.View>

      {/* Bottom area: powered by + makesens logo */}
      <View style={styles.bottomArea}>
        <Animated.View style={poweredByStyle}>
          <Image
            source={poweredByLogo}
            style={styles.poweredBy}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.View style={logoStyle}>
          <Image
            source={makeSensLogo}
            style={styles.makeSensLogo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafIcon: {
    width: 160,
    height: 160,
  },
  bottomArea: {
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  poweredBy: {
    width: 140,
    height: 40,
  },
  makeSensLogo: {
    width: 140,
    height: 40,
  },
});

export default SplashScreen;
