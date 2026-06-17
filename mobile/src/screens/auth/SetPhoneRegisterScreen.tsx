/**
 * B14 — SetPhoneRegisterScreen
 *
 * Ported from: src/app/pages/auth/register/set-phone-register/set-phone-register.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - Loads user session to show personalized subtitle "{name}, por favor..."
 *   - Phone form: required, minLength:10, maxLength:10
 *   - Modal confirmation before signUp
 *   - Modal texts (literal):
 *       content: "¿Es correcto este número de teléfono: <strong>{phone}</strong>?"
 *       textCancelButton: "No, editar"
 *       textOkButton: "Sí, continuar"
 *   - On confirm: SetupService.signUp('+57' + phone) → navigate to Otp (register, phone)
 *
 * Visual ref: docs/evidence/register/screen-07 to screen-09, screen-17
 *   - screen-07: empty, subtitle with user name, button disabled
 *   - screen-08: short phone (12345) — button disabled
 *   - screen-09: valid phone (3001234567) — button enabled
 *   - screen-17: phone confirmation modal (AlertComponent)
 *
 * Tokens: same as LoginScreen (blue gradient, white card, blue[500] input border)
 *
 * Navigation: Otp → { type: 'register', phone }
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { useConfirmModal } from '@/components/ui/ConfirmModal';
import { SetupService } from '@/domain/setup/setup';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
// Original soft-teal background (global.scss %bg → background.svg). NOT a hard gradient.
import BackgroundSvg from '@/assets/svg/background.svg';
// Circular badge logo (logo_badge.svg = original logo.svg circle+icon, full-bleed rects removed).
import LogoSvg from '@/assets/svg/logo_badge.svg';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'SetPhoneRegister'>;

interface PhoneFormValues {
  phone: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetPhoneRegisterScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const { confirmModal, show: showConfirm } = useConfirmModal();

  const {
    control,
    handleSubmit,
    formState: { isValid },
    getValues,
  } = useForm<PhoneFormValues>({
    mode: 'onChange',
    defaultValues: { phone: '' },
  });

  // Load user name for personalized subtitle
  useEffect(() => {
    void SetupService.getParametersUser().then((session) => {
      if (session.name) {
        setUserName(session.name);
      }
    });
  }, []);

  const abrirModal = async (): Promise<void> => {
    const phone = getValues('phone');
    const result = await showConfirm({
      content: `<p> ¿Es correcto este número de teléfono: <strong> ${phone} </strong>? </p>`,
      textCancelButton: 'No, editar',
      textOkButton: 'Sí, continuar',
    });

    if (result !== 'OK') return;

    setLoading(true);
    try {
      const success = await SetupService.signUp('+57' + phone);
      if (success) {
        navigation.navigate('Otp', { type: 'register', phone });
      } else {
        // FIXME: Show modal "El número {phone} ya está registrado" (original FIXME preserved)
        console.error('El numero ya esta registrado');
      }
    } catch (err) {
      console.error('SignUp error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = handleSubmit(() => {
    void abrirModal();
  });

  // Personalized subtitle: "{name}, por favor ingresa tu número de teléfono" (set-phone-register.page.html:3, no trailing period)
  const subtitle = userName
    ? `${userName}, por favor ingresa tu número de teléfono`
    : 'Por favor ingresa tu número de teléfono';

  return (
    <>
      <View style={styles.gradient} testID="set-phone-register-screen">
        {/* Background — original %bg uses background.svg (soft teal), NOT a hard gradient. */}
        <BackgroundSvg
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={styles.background as StyleProp<ViewStyle>}
        />
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
            {/* Logo — circular badge (logo.svg) */}
            <LogoSvg width={70} height={70} testID="logo-image" />

            {/* Title: "Número de teléfono" (set-phone-register.page.html:2) — h1 font-weight:600 (global.scss:119) */}
            <Text
              style={[
                styles.title,
                {
                  fontFamily: fontFamilyForWeight('600'),
                  color: theme.colors.blue[800],
                },
              ]}
            >
              Número de teléfono
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              {subtitle}
            </Text>

            {/* Label */}
            <Text
              style={[
                styles.inputLabel,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              Número de teléfono
            </Text>

            {/* Phone input */}
            <Controller
              control={control}
              name="phone"
              rules={{ required: true, minLength: 10, maxLength: 10 }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.colors.blue[500],
                      backgroundColor: theme.colors.gray[50],
                      color: theme.colors.gray[800],
                      fontFamily: fontFamilyForWeight('400'),
                    },
                  ]}
                  placeholder="XXXXXXXXXX"
                  placeholderTextColor={theme.colors.gray[400]}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  testID="phone-input"
                  accessibilityLabel="Número de teléfono"
                />
              )}
            />

            {/* Continuar button — Ionic disabled = opacity:0.5 over the teal card → muted teal (not gray) */}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.blue[700],
                  opacity: isValid || loading ? 1 : 0.5,
                },
              ]}
              onPress={() => void onSubmit()}
              disabled={!isValid || loading}
              testID="submit-button"
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid || loading }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    { fontFamily: fontFamilyForWeight('600') },
                  ]}
                >
                  Continuar
                </Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </View>

      {confirmModal}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // .container_explore padding:5vw (~18px on 360px)
    padding: 18,
  },
  card: {
    // Frosted card: .card-content_gradient rgba(255,255,255,0.3)→0.8, radius:20 (global.scss:100-106).
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  button: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default SetPhoneRegisterScreen;
