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
 * Visual parity fixes (original SCSS sources):
 *   - Logo: Image 70x70 borderRadius:14 (explore-container / global.scss:195-199)
 *   - Subtitle: "Por favor ingresa tu número de teléfono." (explore-container subTitle)
 *   - Input label: "Número de teléfono" (ion-label, global.scss:151-155)
 *   - Input border: blue[500] (#10BCCA), bg:gray[50] (#FAFAFA), radius:10 (global.scss:170-172)
 *   - Button disabled: blue[700] opacity:0.4 (not gray[300])
 *   - Button radius: 14 (global.scss:197 explore-container ion-button)
 *   - Help text: "Te enviaremos un código..." (login.page.html:25-27)
 *   - Register row: "¿No tienes cuenta?" + "Registrate aquí" side by side (login.page.html:29-32)
 *   - Register link color: blue[800] (#1A6270) (global.scss:275 .ref)
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
  Image,
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
          {/* Logo — ion-thumbnail 70x70, border-radius:14 (explore-container / global.scss:195-199) */}
          <Image
            source={require('@/assets/png/icon-only.png') as number}
            style={styles.logo}
            resizeMode="contain"
            testID="logo-image"
          />

          <Text
            style={[
              styles.title,
              { fontFamily: fontFamilyForWeight('700'), color: theme.semanticColors.text },
            ]}
          >
            Hola de nuevo 👋
          </Text>

          {/* Subtitle — explore-container subTitle (font-size:16, weight:700, gray-700) */}
          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: fontFamilyForWeight('700'),
                color: theme.colors.gray[700],
              },
            ]}
          >
            Por favor ingresa tu número de teléfono.
          </Text>

          {/* Label — ion-label (font-size:14, weight:500, gray-700) global.scss:151-155 */}
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
                    // border: 1px solid var(--Colors-Blue-500) (global.scss:171)
                    // background: var(--Colors-Gray-50) (global.scss:172)
                    borderColor: theme.colors.blue[500],
                    backgroundColor: theme.colors.gray[50],
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

          {/* Continuar button — disabled uses blue[700] + opacity:0.4 (not gray) */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.blue[700],
                opacity: isValid ? 1 : 0.4,
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

          {/* Help text — login.page.html:25-27, font-size:14px */}
          <Text
            style={[
              styles.helpText,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.colors.gray[500],
              },
            ]}
          >
            Te enviaremos un código por mensaje de texto para que puedas acceder.
          </Text>

          {/* Register row — .container_link max-width:300, space-between (login.page.html:29-32) */}
          <View style={styles.registerRow}>
            <Text
              style={[
                styles.registerQuestion,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              ¿No tienes cuenta?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PreRegister')}
              testID="register-link"
            >
              <Text
                style={[
                  styles.registerLink,
                  {
                    // .ref: color:var(--Colors-Blue-800) = #1A6270 (global.scss:275)
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.colors.blue[800],
                  },
                ]}
              >
                Registrate aquí
              </Text>
            </TouchableOpacity>
          </View>
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
    // ion-thumbnail: 70x70, --border-radius:14px (global.scss:195-199)
    width: 70,
    height: 70,
    borderRadius: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    // explore-container subTitle: font-size:16, weight:700, gray-700 (global.scss)
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  inputLabel: {
    // ion-label: font-size:14, weight:500, gray-700 (global.scss:151-155)
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    // border-radius: var(--xl, 10px) → 10 (global.scss:170)
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  button: {
    width: '100%',
    paddingVertical: 13,
    // --border-radius: 14px (global.scss:197 explore-container ion-button)
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  helpText: {
    // paragraph font-size:14px (global.scss)
    fontSize: 14,
    textAlign: 'center',
  },
  registerRow: {
    // .container_link: max-width:300, flex-direction:row, space-between (login.page.html:29-32)
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginTop: 4,
  },
  registerQuestion: {
    // paragraph text-sm: font-size:14
    fontSize: 14,
  },
  registerLink: {
    // .ref: font-size:14, color:var(--Colors-Blue-800)=#1A6270 (global.scss:275)
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
