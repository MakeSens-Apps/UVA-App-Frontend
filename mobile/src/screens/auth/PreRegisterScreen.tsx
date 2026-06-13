/**
 * B14 — PreRegisterScreen
 *
 * Ported from: src/app/pages/auth/register/pre-register/pre-register.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - Checkbox for T&C acceptance gates the "Continuar" button
 *   - Button is disabled until checkbox is checked
 *
 * Visual ref: docs/evidence/register/screen-02-pre-register-empty.png
 *             docs/evidence/register/screen-03-pre-register-checked.png
 *
 * Colors/tokens from variables.scss + evidence README:
 *   - Background: teal gradient blue[500]→blue[700] (bg_blue)
 *   - Card: white, borderRadius:16, padding:24, shadow
 *   - Checkbox color: blue[500] (#10BCCA)
 *   - Button enabled: blue[700] (#14788A), radius:14
 *   - Button disabled: gray[300] (#D4D4D4) — same pattern as LoginScreen
 *   - Title: 20px bold, blue[800] (#1A6270)
 *   - Subtitle: 16px medium, gray[700] (#404040)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'PreRegister'>;

// ─── Component ────────────────────────────────────────────────────────────────

export function PreRegisterScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [accepted, setAccepted] = useState(false);

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="pre-register-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card: LinearGradient rgba(255,255,255,0.3)→rgba(255,255,255,0.8) (global.scss:100-106 .card-content_gradient) */}
        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.card}
        >
          {/* Logo */}
          <Image
            source={require('@/assets/png/icon-only.png') as number}
            style={styles.logo}
            resizeMode="contain"
            testID="logo-image"
          />

          {/* Title — titleHTML="<h1>Hola 👋 es un gusto <br> tenerte aquí! </h1>" (pre-register.page.html:2) */}
          {/* h1: font-weight:600 (global.scss:119 .card-content_gradient h1) */}
          <Text
            style={[
              styles.title,
              {
                fontFamily: fontFamilyForWeight('600'),
                color: theme.colors.blue[800],
              },
            ]}
          >
            Hola 👋 es un gusto{'\n'}tenerte aquí!
          </Text>

          {/* Message — "Uva App, es tu aplicación de monitoreo del clima" (pre-register.page.html:3) */}
          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: fontFamilyForWeight('500'),
                color: theme.colors.gray[700],
              },
            ]}
          >
            Uva App, es tu aplicación de monitoreo del clima
          </Text>

          {/* T&C checkbox row */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAccepted((v) => !v)}
            activeOpacity={0.7}
            testID="terms-checkbox"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
          >
            {/* Custom checkbox */}
            <View
              style={[
                styles.checkboxBox,
                {
                  borderColor: theme.colors.blue[500],
                  backgroundColor: accepted ? theme.colors.blue[500] : 'transparent',
                },
              ]}
            >
              {accepted && (
                <Text
                  style={[
                    styles.checkboxTick,
                    { fontFamily: fontFamilyForWeight('700') },
                  ]}
                >
                  ✓
                </Text>
              )}
            </View>

            {/* Checkbox label: "Aceptar <span class="ref">términos y condiciones</span>" (pre-register.page.html:11) */}
            <Text
              style={[
                styles.checkboxLabel,
                {
                  fontFamily: fontFamilyForWeight('400'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              {'Aceptar '}
              <Text
                style={[
                  styles.linkText,
                  {
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.colors.blue[800],
                  },
                ]}
              >
                términos y condiciones
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Continuar button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: accepted ? theme.colors.blue[700] : theme.colors.gray[300],
              },
            ]}
            onPress={() => navigation.navigate('Register')}
            disabled={!accepted}
            testID="continuar-button"
            accessibilityRole="button"
            accessibilityState={{ disabled: !accepted }}
          >
            <Text
              style={[
                styles.buttonText,
                { fontFamily: fontFamilyForWeight('600') },
              ]}
            >
              Continuar
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    // LinearGradient replaces opaque white: see .card-content_gradient (global.scss:100-106)
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxTick: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  linkText: {
    // .ref: text-decoration:none (global.scss:276) — no underline, only color distinction
    textDecorationLine: 'none',
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

export default PreRegisterScreen;
