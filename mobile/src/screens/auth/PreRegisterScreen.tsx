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
 *   - Button disabled: blue[700] opacity:0.4
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
        <View style={styles.card}>
          {/* Logo */}
          <Image
            source={require('@/assets/png/icon-only.png') as number}
            style={styles.logo}
            resizeMode="contain"
            testID="logo-image"
          />

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
            Bienvenido a UVA
          </Text>

          {/* Subtitle */}
          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: fontFamilyForWeight('500'),
                color: theme.colors.gray[700],
              },
            ]}
          >
            Para continuar, debes aceptar los términos y condiciones de uso.
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

            <Text
              style={[
                styles.checkboxLabel,
                {
                  fontFamily: fontFamilyForWeight('400'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              Acepto los{' '}
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
              </Text>{' '}
              de uso.
            </Text>
          </TouchableOpacity>

          {/* Continuar button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.blue[700],
                opacity: accepted ? 1 : 0.4,
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
        </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    textDecorationLine: 'underline',
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
