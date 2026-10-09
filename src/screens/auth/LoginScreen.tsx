/**
 * B13a — LoginScreen (real implementation)
 *
 * Ported from: src/app/pages/auth/login/login.page.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - Form validation: required, minLength(10), maxLength(10)
 *   - Modal confirmation texts (login.page.ts:102-105) as the user SEES them:
 *       content: "¿Es correcto este número de teléfono: <strong>{phone}</strong>?"
 *       textCancelButton: "No, Editar"
 *       textOkButton: "Sí, Continuar"
 *     The Angular literals are lowercase, but alert.component.scss:16-19 applies
 *     `ion-button { text-transform: capitalize }`, so the rendered labels are
 *     capitalized — docs/evidence/auth-login/screen-04 and
 *     docs/evidence/register/screen-17 (device D18). RN's ConfirmModal has no
 *     cascading text-transform, so the capitalization lives in the strings.
 *   - Post-signIn branch:
 *       isSignedIn (test user / no MFA) → createNewUser + navigate to ProjectVinculation
 *       !isSignedIn (MFA SMS challenge) → navigate to OTP
 *       UserNotFoundException → openModalNoRegister (prompt to register)
 *   - openModalNoRegister texts (literal):
 *       content: "El número <strong>{phone}</strong> no se encuentra registrado. ¿Quieres registrarte?"
 *       textCancelButton: "No"
 *       textOkButton: "Sí, Registrame" (same capitalize rule)
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
 *   - Button disabled: gray[300] (#D4D4D4) — Ionic disabled renders grayish neutral (not saturated teal)
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
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
// Circular badge logo (logo_badge.svg = original logo.svg circle+icon, full-bleed rects removed)
// — matches docs/evidence/auth-login/screen-01.
import LogoSvg from '@/assets/svg/logo_badge.svg';

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
      textOkButton: 'Sí, Registrame',
      backdropDim: 'strong',
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
      textCancelButton: 'No, Editar',
      textOkButton: 'Sí, Continuar',
      backdropDim: 'strong',
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
      <View style={styles.gradient} testID="login-screen">
        {/* Background — original %bg uses background.svg (soft teal), NOT a hard gradient
            (global.scss:59-93).
            IMPORTANT: this must stay a direct child of `gradient`, which has NO padding.
            `width/height: '100%'` on an absolutely-positioned child resolves against the
            parent's CONTENT box, so any padding on the parent left the SVG short of the
            screen edges (a ~18dp gutter showed through on the right). The 5vw padding now
            lives on the inner `content` wrapper instead. */}
        <BackgroundSvg
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={styles.background as StyleProp<ViewStyle>}
        />
        <View style={styles.content}>
          {/* Card: LinearGradient rgba(255,255,255,0.3)→rgba(255,255,255,0.8) (global.scss:100-106 .card-content_gradient) */}
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.card}
          >
            {/* Logo — circular badge (logo.svg): 70x70, white 0.8→0.6 circle, teal icon
              (matches docs/evidence/auth-login/screen-01-login-vacio.png) */}
            <LogoSvg width={70} height={70} testID="logo-image" />

            <Text
              style={[
                styles.title,
                {
                  fontFamily: fontFamilyForWeight('600'),
                  color: theme.colors.blue[800],
                },
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

            {/* Continuar button — color="uva_green-700" (#14788A). Ionic disabled applies opacity:0.5
               to the whole button, so over the frosted teal card it reads as a muted teal
               (measured ~#69B1B8 in screen-01), NOT neutral gray. */}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.blue[700],
                  opacity: isValid ? 1 : 0.5,
                },
              ]}
              onPress={onSubmit}
              disabled={!isValid || loading}
              testID="submit-button"
              accessibilityRole="button"
            >
              {/* No spinner: login.page.html:16-22 is a plain ion-button whose only
                state is [disabled]="form.invalid" (device D17). `loading` still
                blocks a second tap but never changes the label. */}
              <Text
                style={[
                  styles.buttonText,
                  { fontFamily: fontFamilyForWeight('600') },
                ]}
              >
                Continuar
              </Text>
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
              Te enviaremos un código por mensaje de texto para que puedas
              acceder.
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
          </LinearGradient>
        </View>
      </View>

      {/* Confirm modals rendered outside the screen container so they overlay properly */}
      {confirmModal}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    // No padding here — the absolutely-positioned BackgroundSvg is a child of this
    // view and its '100%' size resolves against this view's content box.
    flex: 1,
    // Safety net for edge-to-edge: matches background.svg's own base fill, so no
    // window background can ever show through at a seam.
    backgroundColor: '#4BC5BE',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // 5vw on 360px device = 18px (global.scss .container_explore padding:5vw)
    padding: 18,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  button: {
    width: '100%',
    // max-width:300px (global.scss:181 ion-button in .container_explore)
    maxWidth: 300,
    paddingVertical: 13,
    // ion-button in auth pages: no explicit --border-radius; Ionic md default ≈ 4px.
    // Visual approximation from screen-03 evidence: ~8px.
    borderRadius: 8,
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
    // .ref: font-size:14, color:var(--Colors-Blue-800)=#1A6270, text-decoration:none (global.scss:273-277)
    fontSize: 14,
    textDecorationLine: 'none',
  },
});

export default LoginScreen;
