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
 * B14 specifics:
 *   - ELIMINADO el bypass __DEV__ TODO(B14) de ValidateProjectScreen
 *   - Uses useSyncContext().waitForSync() (replaces SyncMonitorDSService.waitForSyncDataStore())
 *   - Uses useConfigContext().configExists()
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
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import type { AuthStackParamList, RootStackParamList } from '@/navigation/types';
import { SetupService } from '@/domain/setup/setup';
import { SetupRacimoService } from '@/domain/setup/setup-racimo';
import { useConfigContext } from '@/state/ConfigContext';
import { useSyncContext } from '@/state/SyncContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'ProjectVinculation'>;

// Root navigation type — needed to navigate to AppStack
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

interface VinculationFormValues {
  code: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectVinculationScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const { configExists } = useConfigContext();
  const { waitForSync } = useSyncContext();

  // Root navigation for navigating to the App stack
  const rootNavigation = useNavigation<RootNavProp>();

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
              // Has UVA + config → go directly to home
              rootNavigation.reset({
                index: 0,
                routes: [{ name: 'App' }],
              });
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

  // ─── goToValidateProject ────────────────────────────────────────────────

  const goToValidateProject = handleSubmit(async (data) => {
    setLoading(true);
    setShowError(false);
    try {
      const found = await SetupRacimoService.getRACIMOByCode(data.code);
      if (found) {
        navigation.navigate('ValidateProject', { racimoCode: data.code });
      } else {
        setShowError(true);
      }
    } catch (err) {
      console.error('getRACIMOByCode error:', err);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  });

  // ─── Render: initializing spinner ────────────────────────────────────────

  if (initializing) {
    return (
      <LinearGradient
        colors={[theme.colors.blue[500], theme.colors.blue[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
        testID="project-vinculation-initializing"
      >
        <View style={styles.card}>
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
            Vinculando al proyecto
          </Text>
          <ActivityIndicator color={theme.colors.blue[500]} size="large" />
          <TouchableOpacity onPress={() => navigation.navigate('Login')} testID="cancel-init">
            <Text
              style={[
                styles.salirText,
                { fontFamily: fontFamilyForWeight('600'), color: theme.colors.blue[800] },
              ]}
            >
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
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

          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: fontFamilyForWeight('500'),
                color: theme.colors.gray[700],
              },
            ]}
          >
            Ingresa el código de 6 caracteres de tu proyecto.
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
              Código del proyecto
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
                  placeholder="XXXXXX"
                  placeholderTextColor={theme.colors.gray[400]}
                  autoCapitalize="characters"
                  maxLength={6}
                  onBlur={onBlur}
                  onChangeText={(t) => {
                    setShowError(false);
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
                El código ingresado es incorrecto.
              </Text>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.blue[700],
                opacity: isValid ? 1 : 0.4,
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
