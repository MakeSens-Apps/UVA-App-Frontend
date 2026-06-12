/**
 * B14 — ProjectVinculationDoneScreen
 *
 * Ported from: src/app/pages/auth/register/project-vinculation-done/project-vinculation-done.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - Loads branding logo (config.loadImage(config.branding.logo))
 *   - Shows racimoCode (from route.params.racimoCode) — the linkageCode
 *   - Confetti GIF (confety.gif)
 *   - After 3s → navigate to RegisterProjectForm { racimoCode }
 *
 * Visual ref: docs/evidence/register/screen-15
 *   - Branding logo (Fundación Natura Colombia logo)
 *   - Text "Vinculado al proyecto: <racimoCode>"
 *   - Confetti gif
 *
 * Navigation: RegisterProjectForm { racimoCode }
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'ProjectVinculationDone'>;

const REDIRECT_DELAY_MS = 3000;

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectVinculationDoneScreen({ route, navigation }: Props): React.JSX.Element {
  const { racimoCode, racimoName } = route.params;
  const { theme } = useTheme();
  const [brandingLogo, setBrandingLogo] = useState<string | null>(null);

  const { getConfigurationApp, loadImage } = useConfigContext();
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

      // Auto-navigate after 3s
      timerRef.current = setTimeout(() => {
        if (!cancelled) {
          navigation.navigate('RegisterProjectForm', { racimoCode });
        }
      }, REDIRECT_DELAY_MS);
    };

    void init();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [racimoCode, getConfigurationApp, loadImage, navigation]);

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="project-vinculation-done-screen"
    >
      <View style={styles.card}>
        {/* Confetti GIF */}
        <Image
          source={require('@/assets/gifs/confety.gif') as number}
          style={styles.confettiGif}
          resizeMode="cover"
          testID="confetti-gif"
        />

        {/* Branding logo or default icon */}
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
            style={styles.brandLogo}
            resizeMode="contain"
            testID="default-logo"
          />
        )}

        {/* Title */}
        <Text
          style={[
            styles.title,
            {
              fontFamily: fontFamilyForWeight('700'),
              color: theme.colors.blue[800],
            },
          ]}
        >
          ¡Vinculación exitosa!
        </Text>

        {/* Racimo info */}
        <Text
          style={[
            styles.subtitle,
            {
              fontFamily: fontFamilyForWeight('500'),
              color: theme.colors.gray[700],
            },
          ]}
        >
          Vinculado al proyecto:
        </Text>
        {racimoCode ? (
          <Text
            style={[
              styles.racimoCode,
              {
                fontFamily: fontFamilyForWeight('700'),
                color: theme.colors.blue[700],
              },
            ]}
            testID="racimo-code"
          >
            {racimoName ?? racimoCode}
          </Text>
        ) : null}

        {/* Redirecting indicator */}
        <Text
          style={[
            styles.redirectingText,
            {
              fontFamily: fontFamilyForWeight('400'),
              color: theme.colors.gray[500],
            },
          ]}
        >
          Continuando en un momento...
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 14,
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
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  racimoCode: {
    fontSize: 18,
    textAlign: 'center',
  },
  redirectingText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ProjectVinculationDoneScreen;
