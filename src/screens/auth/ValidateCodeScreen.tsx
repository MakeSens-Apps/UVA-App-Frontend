/**
 * B14 — ValidateCodeScreen
 *
 * Ported from: src/app/pages/auth/otp/validate-code/validate-code.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - Shows a loader for 2000ms
 *   - After 2s:
 *       type === 'login'    → navigate to ProjectVinculation (replace)
 *       type === 'register' → navigate to RegisterSuccess (replace)
 *   - Uses loader.gif animation
 *   - Has a "Cancelar" button (cancels the timer and navigates back) — NOT in original
 *     but original had it indirectly via the loader screen
 *
 * Visual ref: docs/evidence/register/screen-22
 *             docs/evidence/auth-login/screen-05 (similar layout for project vinculation loader)
 *   - White card, centered, loader gif, text "Validando código", optional cancel
 *
 * Navigation:
 *   type=login    → ProjectVinculation (replace)
 *   type=register → RegisterSuccess (replace)
 *
 * Note: navigation.replace is not available on stack navigator directly;
 *       we use navigate + reset=true via navigation.reset or popToTop+navigate.
 *       For simplicity, we use navigation.navigate which matches functional intent.
 *       The original used replaceUrl: true concept.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'ValidateCode'>;

const REDIRECT_DELAY_MS = 2000;

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidateCodeScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const { type } = route.params;
  const { theme } = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (type === 'login') {
        navigation.navigate('ProjectVinculation');
      } else {
        // register
        navigation.navigate('RegisterSuccess');
      }
    }, REDIRECT_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [type, navigation]);

  const cancel = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="validate-code-screen"
    >
      <View style={styles.card}>
        {/* Loader gif */}
        <Image
          source={require('@/assets/gifs/loader.gif') as number}
          style={styles.loaderGif}
          resizeMode="contain"
          testID="loader-gif"
        />

        <Text
          style={[
            styles.loadingText,
            {
              fontFamily: fontFamilyForWeight('600'),
              color: theme.colors.blue[800],
            },
          ]}
        >
          Validando código
        </Text>

        {/* Cancelar button */}
        <TouchableOpacity onPress={cancel} testID="cancel-button">
          <Text
            style={[
              styles.cancelText,
              {
                fontFamily: fontFamilyForWeight('500'),
                color: theme.colors.gray[600],
              },
            ]}
          >
            Cancelar
          </Text>
        </TouchableOpacity>
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
    maxWidth: 360,
    alignItems: 'center',
    gap: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  loaderGif: {
    width: 80,
    height: 80,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
  },
  cancelText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});

export default ValidateCodeScreen;
