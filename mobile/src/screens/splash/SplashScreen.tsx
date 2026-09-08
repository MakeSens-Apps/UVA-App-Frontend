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
 * Visual parity fixes (original SCSS source):
 *  - Background: BackgroundSvg component fills the container (replaces backgroundColor:'#E6F4FE')
 *    splash-animation.page.scss: background-image:url('background.svg'), backdrop-filter:blur(25px)
 *  - BlurView intensity:80 overlays the background (approximates backdrop-filter:blur(25px))
 *
 * Portability matrix: SplashAnimationPage → Rewrite → B12
 * Risks: R-41, R-04, R-23, R-15, R-30
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as SplashScreenExpo from 'expo-splash-screen';

import { useAuthGate } from '@/navigation/useAuthGate';

// SVG components (via react-native-svg-transformer — NOT used as Image sources)
import LeafSvg from '@/assets/svg/logo.svg';
import MakeSensLogoSvg from '@/assets/svg/logo_Makesens.svg';
// Background SVG — splash-animation.page.scss: background-image:url('background.svg')
import BackgroundSvg from '@/assets/svg/background.svg';

// Prevent expo native splash from hiding until we're ready
void SplashScreenExpo.preventAutoHideAsync().catch(() => {
  // Already showing or not available in test env — ignore
});

// ─── Assets ───────────────────────────────────────────────────────────────────

const poweredByLogo = require('@/assets/png/Powered_by.png') as number;

/** .leaf-icon rendered size; the circular clip radius is half of it. */
const LEAF_SIZE = 160;

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
  // B13c fix: latest destination in a ref. The reanimated completion callback
  // (scheduleAnimationDone) is created on the FIRST render, so its closure
  // captures destination=null forever. When auth resolved BEFORE the animation
  // finished, maybeFireCallback(null) consumed callbackFired without firing
  // onAuthResolved → splash deadlock. The ref always holds the fresh value
  // (updated in the destination effect below — never during render).
  const destinationRef = useRef<typeof destination>(null);

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

  function maybeFireCallback(): void {
    // B13c fix: read the destination from the ref (never a stale closure) and
    // only consume callbackFired when we can actually fire the callback.
    const dest = destinationRef.current;
    if (animationDone.current && authDone.current && !callbackFired.current && dest) {
      callbackFired.current = true;
      void SplashScreenExpo.hideAsync().catch(() => {});
      if (onAuthResolved) {
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
    destinationRef.current = destination;
    if (destination) {
      authDone.current = true;
      maybeFireCallback();
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
    setTimeout(() => {
      animationDone.current = true;
      maybeFireCallback();
    }, 500);
    // Cleanup handled implicitly (component unmounts after navigation);
    // the returned cleanup was never consumed by callers of this function.
  }

  return (
    <View style={styles.container} testID="splash-screen">
      {/*
       * Background SVG fills the entire container.
       * splash-animation.page.scss: background-image:url('background.svg')
       * position:absolute + fill so it covers without displacing sibling layout.
       */}
      <BackgroundSvg
        width="100%"
        height="100%"
        style={styles.backgroundSvg as StyleProp<ViewStyle>}
        preserveAspectRatio="xMidYMid slice"
      />

      {/*
       * BlurView approximates backdrop-filter:blur(25px) from the original CSS
       * ::before pseudoelement (splash-animation.page.scss:5-14).
       * intensity:40 gives a subtle blur without completely obscuring the BG.
       */}
      <BlurView intensity={40} style={styles.blurOverlay} tint="light" />

      {/* Leaf / UVA logo — animates from top.
          logo.svg bakes a full-bleed #4BC5BE rect behind the round badge; the original
          hides it with `.leaf-icon { border-radius: 50% }` (splash-animation.page.scss:28-31).
          Without the circular clip the splash showed a teal SQUARE that did not match
          the blurred background (device D-42). */}
      <Animated.View style={[styles.leafWrapper, leafStyle]}>
        <View style={styles.leafClip}>
          <LeafSvg width={LEAF_SIZE} height={LEAF_SIZE} />
        </View>
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
          <MakeSensLogoSvg width={140} height={40} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // .leaf-icon { border-radius: 50% } — clips logo.svg's baked square background
  leafClip: {
    width: LEAF_SIZE,
    height: LEAF_SIZE,
    borderRadius: LEAF_SIZE / 2,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    // No backgroundColor — BackgroundSvg provides the background (parity with original)
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundSvg: {
    // Fills the container absolutely, behind all other content
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurOverlay: {
    // Covers entire screen as the blur layer (::before pseudo approximation)
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  leafWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
