/**
 * B13a — LoginScreen (real implementation)
 *
 * Ported from: src/app/pages/auth/login/login.page.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - Form validation: required, minLength(10), maxLength(10)
 *   - Modal confirmation texts (literal from original):
 *       content: "¿Es correcto este número de teléfono: <strong>{phone}</strong>?"
 *       textCancelButton: "No, editar"
 *       textOkButton: "Sí, continuar"
 *   - Post-signIn branch:
 *       isSignedIn (test user / no MFA) → createNewUser + navigate to ProjectVinculation
 *       !isSignedIn (MFA SMS challenge) → navigate to OTP
 *       UserNotFoundException → openModalNoRegister (prompt to register)
 *   - openModalNoRegister texts (literal):
 *       content: "El número <strong>{phone}</strong> no se encuentra registrado. ¿Quieres registrarte?"
 *       textCancelButton: "No"
 *       textOkButton: "Sí, registrame"
 *   - isTestUser('+57' + phone) skips OTP (already encoded in auth.SignIn → isSignedIn=true)
 *   - SetupService.signIn/createNewUser used (NOT direct authService)
 *
 * Changes from original:
 *   - FormBuilder/ReactiveFormsModule → react-hook-form
 *   - ModalController + AlertComponent → useConfirmModal (B10)
 *   - Router.navigate → navigation.navigate (React Navigation typed params)
 *   - ion-* → RN primitives + ExploreContainer (B11)
 *
 * Navigation paths:
 *   - OTP screen: navigation.navigate('Otp', { type: 'login', phone })
 *   - ProjectVinculation: navigation.navigate('ProjectVinculation') [test user / direct signIn]
 *   - PreRegister: navigation.navigate('PreRegister') [UserNotFoundException → register]
 *
 * Risks: R-15, R-07, R-17
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { useConfirmModal } from '@/components/ui/ConfirmModal';
import { SetupService } from '@/domain/setup/setup';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

interface LoginFormValues {
  phone: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * LoginScreen
 *
 * Phone-based login with confirmation modal.
 * Equivalent to LoginPage in Ionic.
 */
export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const { confirmModal, show: showConfirm } = useConfirmModal();

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<LoginFormValues>({
    mode: 'onChange',
    defaultValues: { phone: '' },
  });

  // ─── openModalNoRegister ─────────────────────────────────────────────────

  /**
   * Opens a modal notifying the user that their phone is not registered.
   * Texts preserved exactly from original.
   */
  async function openModalNoRegister(phone: string): Promise<void> {
    const result = await showConfirm({
      content: `<p> El número <strong> ${phone} </strong> no se encuentra registrado. </p><h3>¿Quieres registrarte?</h3>`,
      textCancelButton: 'No',
      textOkButton: 'Sí, registrame',
    });

    if (result === 'OK') {
      navigation.navigate('PreRegister');
    }
  }

  // ─── goToOtp / abrirModal ────────────────────────────────────────────────

  /**
   * Opens confirmation modal for the phone number.
   * On confirm → signIn → branch by result.
   * Preserved logic from abrirModal() in original.
   */
  async function abrirModal(phone: string): Promise<void> {
    const result = await showConfirm({
      content: `<p> ¿Es correcto este número de teléfono: <strong> ${phone} </strong>? </p>`,
      textCancelButton: 'No, editar',
      textOkButton: 'Sí, continuar',
    });

    if (result !== 'OK') return;

    setLoading(true);
    try {
      const response = await SetupService.signIn('+57' + phone);

      if (!response.success) {
        if (response.error.name === 'UserNotFoundException') {
          await openModalNoRegister(phone);
        }
        return;
      }

      // signIn succeeded — check if MFA is required
      if (response.data.isSignedIn) {
        // Test user or no MFA: direct flow
        await SetupService.createNewUser();
        navigation.navigate('ProjectVinculation');
      } else {
        // MFA SMS challenge → OTP screen
        navigation.navigate('Otp', { type: 'login', phone });
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── onSubmit ────────────────────────────────────────────────────────────

  const onSubmit = handleSubmit((data) => {
    void abrirModal(data.phone);
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <LinearGradient
        colors={[theme.colors.blue[500], theme.colors.blue[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
        testID="login-screen"
      >
        <View style={styles.card}>
          {/* Logo placeholder */}
          <Text
            style={[
              styles.logo,
              { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[600] },
            ]}
          >
            UVA
          </Text>

          <Text
            style={[
              styles.title,
              { fontFamily: fontFamilyForWeight('700'), color: theme.semanticColors.text },
            ]}
          >
            Hola de nuevo 👋
          </Text>

          {/* Phone input */}
          <Controller
            control={control}
            name="phone"
            rules={{
              required: true,
              minLength: 10,
              maxLength: 10,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.gray[300],
                    color: theme.semanticColors.text,
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

          {/* Continuar button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: isValid
                  ? theme.colors.blue[700]
                  : theme.colors.gray[300],
              },
            ]}
            onPress={onSubmit}
            disabled={!isValid || loading}
            testID="submit-button"
            accessibilityRole="button"
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

          {/* Help text */}
          <Text
            style={[
              styles.helpText,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.colors.gray[500],
              },
            ]}
          >
            Ingresa tu número de celular para continuar.
          </Text>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('PreRegister')}
            testID="register-link"
          >
            <Text
              style={[
                styles.registerLink,
                {
                  fontFamily: fontFamilyForWeight('600'),
                  color: theme.colors.blue[600],
                },
              ]}
            >
              Registrate aquí
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Confirm modals rendered outside LinearGradient so they overlay properly */}
      {confirmModal}
    </>
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
    gap: 12,
    // Shadow
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  logo: {
    fontSize: 32,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  button: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
  },
  registerLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
