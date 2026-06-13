/**
 * B14 — OtpScreen
 *
 * Ported from: src/app/pages/auth/otp/otp.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - 6 single-digit TextInput fields, auto-advance on digit entry
 *   - Auto-submit on 6th digit
 *   - Timer: 60s countdown, format M:SS; when 0 → show "Reenviar código" button
 *   - resetTime(): re-sends SMS (reSendCodeSignIn | reSendCodeSignUp) + resets timer to 60
 *   - validateForm():
 *       type=login: confirmSignIn(otp) → if false, showError; else createNewUser → ValidateCode
 *       type=register: confirmSignUp(otp) → if false, showError; else → ValidateCode
 *   - showError: shows inline error card "El código ingresado es incorrecto."
 *   - On error: clear all fields, focus first input
 *   - goToHome (Salir): navigate to Login
 *   - Bypass test user: if isSignedIn at login time (already handled in LoginScreen),
 *     OTP is never reached for test user.
 *
 * Visual ref: docs/evidence/register/screen-20, screen-21
 *             docs/evidence/auth-login/screen-06 to screen-09
 *   - screen-06: 6 inputs empty, timer countdown, "Salir" button
 *   - screen-07: partial fill (3 digits), auto-focus
 *   - screen-08: error card after wrong code, inputs cleared
 *   - screen-09: timer=0, "Reenviar código" button shown
 *
 * Tokens (evidence README):
 *   - Background: teal gradient (same as Login)
 *   - Card: white, rounded 16
 *   - OTP inputs: TextInput, underline style (borde inferior)
 *   - Error card: white with border, title danger (#E5245E)
 *   - Reenviar button: blue[500] fill, white text
 *   - Salir: text link, blue[800]
 *
 * Navigation: ValidateCode → { type, phone }
 * Risks: R-07
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { SetupService } from '@/domain/setup/setup';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

const OTP_LENGTH = 6;
const TIMER_SECONDS = 60;

// ─── Component ────────────────────────────────────────────────────────────────

export function OtpScreen({ route, navigation }: Props): React.JSX.Element {
  const { type, phone } = route.params;
  const { theme } = useTheme();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Timer ────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    setTimer(TIMER_SECONDS); // eslint-disable-line react-hooks/set-state-in-effect
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Format time ──────────────────────────────────────────────────────────

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Clear all inputs ─────────────────────────────────────────────────────

  const clearOtp = (): void => {
    setOtp(Array(OTP_LENGTH).fill(''));
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 50);
  };

  // ─── validateForm ────────────────────────────────────────────────────────

  const validateForm = useCallback(
    async (otpValue: string): Promise<void> => {
      if (otpValue.length !== OTP_LENGTH) return;

      setLoading(true);
      try {
        switch (type) {
          case 'login': {
            // Check if already signed in (test user) — only if not already confirmed
            const alreadyAuthed = await SetupService.currentAuthenticatedUser();
            if (!alreadyAuthed) {
              const responseLogin = await SetupService.confirmSignIn(otpValue);
              if (!responseLogin) {
                setShowError(true);
                clearOtp();
                return;
              }
            }

            const responseNewUser = await SetupService.createNewUser();
            if (responseNewUser) {
              navigation.navigate('ValidateCode', { type, phone });
            } else {
              Alert.alert('Alerta', 'No se pudo crear el usuario');
            }
            break;
          }
          case 'register': {
            const responseRegister = await SetupService.confirmSignUp(otpValue);
            if (!responseRegister) {
              setShowError(true);
              clearOtp();
              return;
            }
            navigation.navigate('ValidateCode', { type, phone });
            break;
          }
          default:
            console.error('Tipo de OTP desconocido:', type);
        }
      } catch (err) {
        console.error('OTP validation error:', err);
      } finally {
        setLoading(false);
      }
    },
    [type, phone, navigation],
  );

  // ─── Input handlers ───────────────────────────────────────────────────────

  const handleChange = (text: string, index: number): void => {
    // Only accept single digit
    const digit = text.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setShowError(false);

    if (digit !== '' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === OTP_LENGTH - 1 && digit !== '') {
      const full = newOtp.join('');
      if (full.length === OTP_LENGTH) {
        void validateForm(full);
      }
    }
  };

  const handleKeyPress = (key: string, index: number): void => {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ─── Reset timer + resend ────────────────────────────────────────────────

  const resetTime = async (): Promise<void> => {
    switch (type) {
      case 'login':
        await SetupService.reSendCodeSignIn();
        break;
      case 'register':
        await SetupService.reSendCodeSignUp();
        break;
    }
    setTimer(TIMER_SECONDS);
    startTimer();
    clearOtp();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="otp-screen"
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
            Verifica tu teléfono
          </Text>

          {/* Instructions */}
          <Text
            style={[
              styles.instruction,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.colors.gray[700],
              },
            ]}
          >
            Ingresa el código de 6 dígitos que enviamos por mensaje de texto al número:{' '}
            <Text style={{ fontFamily: fontFamilyForWeight('700') }}>{phone}</Text>
          </Text>

          {/* OTP inputs row */}
          <View style={styles.otpRow} testID="otp-inputs">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  {
                    // otp.page.scss:12: border-bottom: 2px solid var(--Colors-Gray-600) = #525252
                    borderColor: showError
                      ? theme.colors.danger
                      : theme.colors.gray[600],
                    color: theme.colors.gray[800],
                    fontFamily: fontFamilyForWeight('700'),
                  },
                ]}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                testID={`otp-input-${index}`}
                editable={!loading}
              />
            ))}
          </View>

          {/* Error card */}
          {showError && (
            <View style={styles.errorCard} testID="otp-error">
              <Text
                style={[
                  styles.errorTitle,
                  {
                    fontFamily: fontFamilyForWeight('700'),
                    color: theme.colors.danger,
                  },
                ]}
              >
                El código ingresado es incorrecto.
              </Text>
              <Text
                style={[
                  styles.errorSubtitle,
                  {
                    fontFamily: fontFamilyForWeight('400'),
                    color: theme.colors.gray[600],
                  },
                ]}
              >
                Por favor, inténtalo de nuevo o pide un nuevo código.
              </Text>
            </View>
          )}

          {/* Timer or Resend button */}
          {timer > 0 ? (
            <Text
              style={[
                styles.timerText,
                {
                  fontFamily: fontFamilyForWeight('400'),
                  color: theme.colors.gray[500],
                },
              ]}
              testID="otp-timer"
            >
              ¿No has recibido ningún código? Puedes pedir uno nuevo en{' '}
              {formatTime(timer)} min.
            </Text>
          ) : (
            <TouchableOpacity
              style={[
                styles.resendButton,
                { backgroundColor: theme.colors.blue[500] },
              ]}
              onPress={() => void resetTime()}
              testID="resend-button"
            >
              <Text
                style={[
                  styles.resendText,
                  { fontFamily: fontFamilyForWeight('600') },
                ]}
              >
                Reenviar código
              </Text>
            </TouchableOpacity>
          )}

          {/* Salir link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            testID="salir-button"
          >
            <Text
              style={[
                styles.salirText,
                {
                  fontFamily: fontFamilyForWeight('600'),
                  color: theme.colors.blue[800],
                },
              ]}
            >
              Salir
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
    // ion-thumbnail: 70x70, --border-radius:14px, bg:#F5F5F5 (global.scss:195-199)
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  otpInput: {
    // Underline-style input (borde inferior) — otp.page.scss:9-18
    // width:40px (otp.page.scss:17), font-size:26px (otp.page.scss:14)
    width: 40,
    height: 52,
    borderBottomWidth: 2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    textAlign: 'center',
    fontSize: 26,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5245E',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  errorTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  resendText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  salirText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default OtpScreen;
