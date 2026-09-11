/**
 * B14 — RegisterSuccessScreen
 *
 * Ported from: src/app/pages/auth/register/register-success/register-success.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - goToLogin() → navigate to Login with replace (clear history)
 *   - No auto-redirect (user must press button)
 *
 * Visual ref: docs/evidence/register/screen-19
 *             docs/evidence/auth-login/screen-10
 *   - Check icon (green)
 *   - Title: "Registro completado satisfactoriamente."
 *   - Subtitle: "Inicia sesión para empezar a usar UVA app"
 *   - Button: "Iniciar Sesión" — blue[700], radius:14
 *   - No back button
 *
 * Navigation: Login (replace — no back stack)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterSuccess'>;

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterSuccessScreen({
  navigation,
}: Props): React.JSX.Element {
  const { theme } = useTheme();

  const goToLogin = (): void => {
    // Replace the entire auth stack back to Login (replaceUrl: true equivalent)
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <LinearGradient
      colors={[theme.colors.blue[50], theme.colors.blue[200]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="register-success-screen"
    >
      <View style={styles.card}>
        {/* Done GIF (confetti + success visual) */}
        <Image
          source={require('@/assets/gifs/done_register.gif') as number}
          style={styles.doneGif}
          resizeMode="contain"
          testID="done-gif"
        />

        {/* Title — exact text from original */}
        <Text
          style={[
            styles.title,
            {
              fontFamily: fontFamilyForWeight('700'),
              color: theme.colors.blue[800],
            },
          ]}
        >
          Registro completado satisfactoriamente.
        </Text>

        {/* Subtitle */}
        <Text
          style={[
            styles.subtitle,
            {
              fontFamily: fontFamilyForWeight('400'),
              color: theme.colors.gray[600],
            },
          ]}
        >
          Inicia sesión para empezar a usar UVA app
        </Text>

        {/* Iniciar Sesión button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.blue[700] }]}
          onPress={goToLogin}
          testID="go-to-login-button"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.buttonText,
              { fontFamily: fontFamilyForWeight('600') },
            ]}
          >
            Iniciar Sesión
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
    maxWidth: 400,
    alignItems: 'center',
    gap: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  doneGif: {
    // Original screen-10: icon occupies ≈80px visually in the card
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default RegisterSuccessScreen;
