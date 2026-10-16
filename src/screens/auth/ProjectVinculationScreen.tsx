/**
 * B14 — ProjectVinculationScreen (REAL implementation)
 *
 * Ported from: src/app/pages/auth/register/project-vinculation/project-vinculation.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic (verbatim from original):
 *   - ngOnInit: getParametersUser() → if userID exists, getUVA(userID):
 *       UVA found + no configExists  → waitForSync → ValidateProject
 *       UVA found + configExists     → waitForSync → AppTabs (Home)
 *   - Form: code (required, minLength:6, maxLength:6)
 *   - goToValidateProject(): getRACIMOByCode(code) → ValidateProject | showError=true
 *   - showError: inline error card "El código ingresado es incorrecto."
 *   - Salir link → Login
 *
 * F4-06 (#61): a RACIMO that is not active does not admit new participants. Its code shows
 * "Este RACIMO no está activo y no admite nuevos participantes" in the same error card and
 * nothing is written in session. The register form comes back here with
 * `racimoInactive` if the RACIMO is deactivated before the UVA is created.
 *
 * B14 specifics:
 *   - ELIMINADO el bypass __DEV__ TODO(B14) de ValidateProjectScreen
 *   - Uses useSyncContext().waitForSync() (replaces SyncMonitorDSService.waitForSyncDataStore())
 *   - Uses useConfigContext().configExists()
 *
 * Fixes applied (remediación setup-auth):
 *   - Subtitle now uses personalized message with user name and WhatsApp reference,
 *     matching original: "{{user?.name}}, por último ingresa el código de invitación
 *     enviado a tu Whatsapp del proyecto al que quieres pertenecer."
 *     (coverage-audit auth-register / ProjectVinculationScreen — PARCIAL)
 *   - Placeholder restored to "Ejemplo: ISA234" (original project-vinculation.page.html:15)
 *
 * Visual ref: docs/evidence/register/screen-10 to screen-13
 *   - screen-10: empty, button disabled, "Salir" link
 *   - screen-11: code 3 chars — button disabled
 *   - screen-12: code 6 chars — button enabled
 *   - screen-13: invalid code → error card "El código ingresado es incorrecto."
 *
 * Tokens: blue gradient, white card; inputs: blue[500] border, gray[50] bg
 *
 * Navigation:
 *   ValidateProject: { racimoCode }
 *   AppTabs > HomeStack > Home (if config already exists)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ExploreContainer } from '@/components/explore-container/ExploreContainer';
import type { AuthStackParamList } from '@/navigation/types';
import { SetupService } from '@/domain/setup/setup';
import { SetupRacimoService } from '@/domain/setup/setup-racimo';
import { useConfigContext } from '@/state/ConfigContext';
import { useSyncContext } from '@/state/SyncContext';
import { useNavigationGate } from '@/navigation/useNavigationGate';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'ProjectVinculation'>;

interface VinculationFormValues {
  code: string;
}

export const INVALID_CODE_MESSAGE = 'El código ingresado es incorrecto.';
export const RACIMO_INACTIVE_LINK_MESSAGE =
  'Este RACIMO no está activo y no admite nuevos participantes';

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectVinculationScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { theme } = useTheme();
  const racimoInactiveParam = route.params?.racimoInactive ?? false;
  const [errorMessage, setErrorMessage] = useState<string | null>(
    racimoInactiveParam ? RACIMO_INACTIVE_LINK_MESSAGE : null,
  );
  const showError = errorMessage !== null;
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  // Personalized message: user name from session (original: {{user?.name}})
  const [userName, setUserName] = useState('');

  const { configExists } = useConfigContext();
  const { waitForSync } = useSyncContext();

  // Cross-stack transition to the App stack (gate flip, not a reset to an
  // unmounted route — see useNavigationGate / navigationGate).
  const { goToApp } = useNavigationGate();

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<VinculationFormValues>({
    mode: 'onChange',
    defaultValues: { code: '' },
  });

  // ─── ngOnInit logic ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      const user = await SetupService.getParametersUser();
      // Store user name for personalized message (original: user?.name)
      if (!cancelled) setUserName(user.name ?? '');

      if (user.userID) {
        const hasUVA = await SetupRacimoService.getUVA(user.userID);
        if (hasUVA) {
          // User already linked to a UVA
          const hasConfig = await configExists();
          await waitForSync();
          if (!cancelled) {
            if (!hasConfig) {
              // Has UVA but no config downloaded yet → download
              navigation.navigate('ValidateProject', {
                racimoCode: user.racimoLinkCode ?? '',
              });
            } else {
              // Has UVA + config → go directly to home (flip gate → App stack)
              goToApp();
            }
          }
          return;
        }
      }
      if (!cancelled) setInitializing(false);
    };

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F4-06 (#61): back from the register form because the RACIMO was deactivated. The
  // message is set while rendering when the param arrives, and the effect only clears the
  // param so the next return shows it again.
  const [seenInactiveParam, setSeenInactiveParam] =
    useState(racimoInactiveParam);
  if (racimoInactiveParam !== seenInactiveParam) {
    setSeenInactiveParam(racimoInactiveParam);
    if (racimoInactiveParam) setErrorMessage(RACIMO_INACTIVE_LINK_MESSAGE);
  }
  useEffect(() => {
    if (racimoInactiveParam) {
      navigation.setParams({ racimoInactive: undefined });
    }
  }, [racimoInactiveParam, navigation]);

  // ─── goToValidateProject ────────────────────────────────────────────────

  const goToValidateProject = handleSubmit(async (data) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const lookup = await SetupRacimoService.getRACIMOByCode(data.code);
      if (lookup === 'found') {
        navigation.navigate('ValidateProject', { racimoCode: data.code });
      } else if (lookup === 'inactive') {
        setErrorMessage(RACIMO_INACTIVE_LINK_MESSAGE);
      } else {
        setErrorMessage(INVALID_CODE_MESSAGE);
      }
    } catch (err) {
      console.error('getRACIMOByCode error:', err);
      setErrorMessage(INVALID_CODE_MESSAGE);
    } finally {
      setLoading(false);
    }
  });

  // ─── Render: initializing spinner ────────────────────────────────────────

  if (initializing) {
    // Same loader card as validate-project (app-explore-container + loader.gif +
    // solid "Cancelar"). `styles.gradient` is only { flex: 1 }, so the plain <View>
    // used before pinned an opaque full-width panel to the top of the screen, over
    // the status bar (device D3, frames 225–239).
    return (
      <View style={styles.gradient} testID="project-vinculation-initializing">
        <ExploreContainer title="Vinculando al proyecto">
          <Image
            source={require('@/assets/gifs/loader.gif') as number}
            style={styles.loader}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={[
              styles.cancelButton,
              { backgroundColor: theme.colors.blue[700] },
            ]}
            onPress={() => navigation.navigate('Login')}
            testID="cancel-init"
          >
            <Text
              style={[
                styles.cancelButtonText,
                { fontFamily: fontFamilyForWeight('500') },
              ]}
            >
              Cancelar
            </Text>
          </TouchableOpacity>
        </ExploreContainer>
      </View>
    );
  }

  // ─── Render: main form ────────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="project-vinculation-screen"
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

          <Text
            style={[
              styles.title,
              {
                fontFamily: fontFamilyForWeight('700'),
                color: theme.colors.blue[800],
              },
            ]}
          >
            Vinculate al proyecto
          </Text>

          {/*
           * Personalized message — original: "{{user?.name}}, por último ingresa el código
           * de invitación enviado a tu Whatsapp del proyecto al que quieres pertenecer."
           * (project-vinculation.page.html:3)
           */}
          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: fontFamilyForWeight('500'),
                color: theme.colors.gray[700],
              },
            ]}
            testID="vinculation-subtitle"
          >
            {userName
              ? `${userName}, por último ingresa el código de invitación enviado a tu Whatsapp del proyecto al que quieres pertenecer.`
              : 'Por último ingresa el código de invitación enviado a tu Whatsapp del proyecto al que quieres pertenecer.'}
          </Text>

          {/* Code input */}
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
              Código de invitación
            </Text>
            <Controller
              control={control}
              name="code"
              rules={{ required: true, minLength: 6, maxLength: 6 }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: showError
                        ? theme.colors.danger
                        : theme.colors.blue[500],
                      backgroundColor: theme.colors.gray[50],
                      color: theme.colors.gray[800],
                      fontFamily: fontFamilyForWeight('400'),
                    },
                  ]}
                  placeholder="Ejemplo: ISA234"
                  placeholderTextColor={theme.colors.gray[400]}
                  autoCapitalize="characters"
                  maxLength={6}
                  onBlur={onBlur}
                  onChangeText={(t) => {
                    setErrorMessage(null);
                    onChange(t.toUpperCase());
                  }}
                  value={value}
                  testID="code-input"
                />
              )}
            />
          </View>

          {/* Error card */}
          {showError && (
            <View style={styles.errorCard} testID="vinculation-error">
              <Text
                style={[
                  styles.errorText,
                  {
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.colors.danger,
                  },
                ]}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Submit button — disabled: gray[300] (#D4D4D4) same pattern as LoginScreen */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: isValid
                  ? theme.colors.blue[700]
                  : theme.colors.gray[300],
              },
            ]}
            onPress={() => void goToValidateProject()}
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

          {/* Salir link (navigate to Login) */}
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
  loader: {
    // .loader { width: 78px } (global.scss:191)
    width: 78,
    height: 78,
  },
  cancelButton: {
    // ion-button inside .card: width 100%, max-width 300, height 44 (global.scss:181-188)
    width: '100%',
    maxWidth: 300,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    letterSpacing: 2,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5245E',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
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
  salirText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});

export default ProjectVinculationScreen;
