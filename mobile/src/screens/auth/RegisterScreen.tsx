/**
 * B14 — RegisterScreen (nombre + apellido)
 *
 * Ported from: src/app/pages/auth/register/register.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - Form: name (required, minLength:3), lastName (required, minLength:3)
 *   - On submit: setParametersUser(name, lastName) then navigate to SetPhoneRegister
 *   - Error state on inputs with minLength violation (border turns red)
 *
 * Visual ref: docs/evidence/register/screen-04 to screen-06
 *   - screen-04: empty form, button disabled
 *   - screen-05: short values (Ab/Cd) → border_error on both inputs, disabled button
 *   - screen-06: valid values (Carlos/Gomez) → button enabled
 *
 * Tokens (variables.scss + README):
 *   - Input border active: blue[500] (#10BCCA), bg: gray[50] (#FAFAFA), radius:10
 *   - Input border error: danger (#E5245E)
 *   - Button enabled: blue[700] (#14788A), radius:14
 *   - Title: 20px bold, blue[800]
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { SetupService } from '@/domain/setup/setup';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

interface RegisterFormValues {
  name: string;
  lastName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<RegisterFormValues>({
    mode: 'onChange',
    defaultValues: { name: '', lastName: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    await SetupService.setParametersUser(data.name, data.lastName);
    navigation.navigate('SetPhoneRegister');
  });

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="register-screen"
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
          />

          {/* Title: "¡Conozcámonos!" (register.page.html:1) — h1 font-weight:600 (global.scss:119) */}
          <Text
            style={[
              styles.title,
              {
                fontFamily: fontFamilyForWeight('600'),
                color: theme.colors.blue[800],
              },
            ]}
          >
            ¡Conozcámonos!
          </Text>

          {/* Message: "¿Cómo es tu nombre?" (register.page.html:1) */}
          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: fontFamilyForWeight('500'),
                color: theme.colors.gray[700],
              },
            ]}
          >
            ¿Cómo es tu nombre?
          </Text>

          {/* Name field — label "Nombres", placeholder "Ingresa tus nombres" (register.page.html:5,8) */}
          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              Nombres
            </Text>
            <Controller
              control={control}
              name="name"
              rules={{ required: true, minLength: 3 }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: errors.name
                        ? theme.colors.danger
                        : theme.colors.blue[500],
                      backgroundColor: theme.colors.gray[50],
                      color: theme.colors.gray[800],
                      fontFamily: fontFamilyForWeight('400'),
                    },
                  ]}
                  placeholder="Ingresa tus nombres"
                  placeholderTextColor={theme.colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  testID="name-input"
                  autoCapitalize="words"
                />
              )}
            />
          </View>

          {/* LastName field — label "Apellidos", placeholder "Ingresa tus apellidos" (register.page.html:15,19) */}
          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              Apellidos
            </Text>
            <Controller
              control={control}
              name="lastName"
              rules={{ required: true, minLength: 3 }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: errors.lastName
                        ? theme.colors.danger
                        : theme.colors.blue[500],
                      backgroundColor: theme.colors.gray[50],
                      color: theme.colors.gray[800],
                      fontFamily: fontFamilyForWeight('400'),
                    },
                  ]}
                  placeholder="Ingresa tus apellidos"
                  placeholderTextColor={theme.colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  testID="lastName-input"
                  autoCapitalize="words"
                />
              )}
            />
          </View>

          {/* Submit button — disabled: gray[300] (#D4D4D4) same pattern as LoginScreen (global.scss disabled ion-button) */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: isValid ? theme.colors.blue[700] : theme.colors.gray[300],
              },
            ]}
            onPress={() => void onSubmit()}
            disabled={!isValid}
            testID="submit-button"
            accessibilityRole="button"
            accessibilityState={{ disabled: !isValid }}
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
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  logo: {
    // ion-thumbnail: 70x70, --border-radius:14px, bg:#F5F5F5 (global.scss:195-199)
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
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
    marginBottom: 4,
  },
  fieldGroup: {
    width: '100%',
    gap: 4,
  },
  label: {
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
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

export default RegisterScreen;
