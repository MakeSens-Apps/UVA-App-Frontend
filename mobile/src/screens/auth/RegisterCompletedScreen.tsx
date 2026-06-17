/**
 * B14 — RegisterCompletedScreen
 *
 * Ported from: src/app/pages/auth/register/register-completed/register-completed.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - Shows branding logo (from ConfigContext)
 *   - Shows confetti GIF (confety.gif)
 *   - After 3s → navigate to AppTabs (reset to App root stack)
 *
 * Visual ref: docs/evidence/register/screen-18
 *   - Branding logo
 *   - "Registro completado"
 *   - "¡Empecemos!"
 *   - Confetti gif
 *
 * Note: original navigates to 'app/tabs/home'. In RN the App stack is mounted
 * CONDITIONALLY by RootNavigator (Auth OR App, never both). A
 * `reset({ routes: [{ name: 'App' }] })` from inside the Auth stack is a silent
 * no-op (the 'App' route is not mounted) → the screen froze here. We flip the
 * gate via useNavigationGate().goToApp() instead, which re-mounts the App stack.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useConfigContext } from '@/state/ConfigContext';
import { useNavigationGate } from '@/navigation/useNavigationGate';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

const REDIRECT_DELAY_MS = 3000;

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterCompletedScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const [brandingLogo, setBrandingLogo] = useState<string | null>(null);

  const { getConfigurationApp, loadImage } = useConfigContext();
  const { goToApp } = useNavigationGate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      // Load branding logo
      const config = await getConfigurationApp();
      if (config && !cancelled) {
        const logoUri = await loadImage(config.branding.logo);
        if (logoUri && !cancelled) setBrandingLogo(logoUri);
      }

      // Auto-transition to the App stack after 3s.
      // Flip the gate (re-mounts App stack) instead of resetting to an unmounted route.
      timerRef.current = setTimeout(() => {
        if (!cancelled) {
          goToApp();
        }
      }, REDIRECT_DELAY_MS);
    };

    void init();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="register-completed-screen"
    >
      <View style={styles.card}>
        {/* Confetti GIF (behind content) */}
        <Image
          source={require('@/assets/gifs/confety.gif') as number}
          style={styles.confettiGif}
          resizeMode="cover"
          testID="confetti-gif"
        />

        {/* Branding logo or default */}
        {brandingLogo ? (
          <Image
            source={{ uri: brandingLogo }}
            style={styles.brandLogo}
            resizeMode="contain"
            testID="brand-logo"
          />
        ) : (
          <Image
            source={require('@/assets/png/icon-only.png') as number}
            style={styles.logo}
            resizeMode="contain"
          />
        )}

        <Text
          style={[
            styles.title,
            {
              fontFamily: fontFamilyForWeight('700'),
              color: theme.colors.blue[800],
            },
          ]}
        >
          Registro completado
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              fontFamily: fontFamilyForWeight('600'),
              color: theme.colors.blue[600],
            },
          ]}
        >
          ¡Empecemos!
        </Text>

        <Text
          style={[
            styles.hint,
            {
              fontFamily: fontFamilyForWeight('400'),
              color: theme.colors.gray[500],
            },
          ]}
        >
          Iniciando aplicación...
        </Text>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  confettiGif: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    opacity: 0.7,
  },
  brandLogo: {
    width: 120,
    height: 60,
    marginTop: 160,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 14,
    marginTop: 160,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default RegisterCompletedScreen;
