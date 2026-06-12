/**
 * B14 — RegisterProjectFormScreen
 *
 * Ported from: src/app/pages/auth/register/register-project-form/register-project-form.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic:
 *   - ngOnInit: getParametersUser() → check getUVA(userID)
 *       if UVA exists → navigate immediately to RegisterCompleted
 *   - Load configModel from getConfigurationApp()
 *   - Load branding logo
 *   - Build form dynamically from configModel.fieldsUVA (each field: required, minLength:4)
 *   - goToCompleted(): createNewUVA() + updateUVA(formValues) → RegisterCompleted | back
 *   - If no configModel → show empty state (screen-16: "sin campos dinámicos")
 *
 * Visual ref: docs/evidence/register/screen-16
 *   - Title: "Datos de ubicación"
 *   - Message: "{name} por favor completa los siguientes datos:"
 *   - Dynamic fields from fieldsUVA (displayText as label + placeholder)
 *   - Button disabled if form invalid
 *
 * Tokens: blue gradient, white card, blue[500] inputs
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import type { Field } from '@/data/models/configuration/config.model';
import { SetupService } from '@/domain/setup/setup';
import { SetupRacimoService } from '@/domain/setup/setup-racimo';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterProjectForm'>;

interface FieldState {
  value: string;
  hasError: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterProjectFormScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [brandingLogo, setBrandingLogo] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldState>>({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const { getConfigurationApp, loadImage } = useConfigContext();

  // ─── Init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      const user = await SetupService.getParametersUser();
      if (!cancelled) setUserName(user.name ?? '');

      // If user already has a UVA, skip to RegisterCompleted
      const hasUVA = await SetupRacimoService.getUVA(user.userID ?? '');
      if (hasUVA) {
        if (!cancelled) navigation.navigate('RegisterCompleted');
        return;
      }

      const config = await getConfigurationApp();
      if (config && !cancelled) {
        // Load branding
        const logoUri = await loadImage(config.branding.logo);
        if (logoUri && !cancelled) setBrandingLogo(logoUri);

        // Build field list from fieldsUVA
        const fieldList = Object.values(config.fieldsUVA).filter((f) => f.enabled);
        setFields(fieldList);

        // Init field state
        const initValues: Record<string, FieldState> = {};
        fieldList.forEach((f) => {
          initValues[f.fieldId] = { value: '', hasError: false };
        });
        setFieldValues(initValues);
      }

      if (!cancelled) setInitializing(false);
    };

    void init();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Form helpers ──────────────────────────────────────────────────────

  const isFormValid = (): boolean => {
    return fields.every((f) => (fieldValues[f.fieldId]?.value?.length ?? 0) >= 4);
  };

  const handleFieldChange = (fieldId: string, text: string): void => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: { value: text, hasError: text.length > 0 && text.length < 4 },
    }));
  };

  const handleFieldBlur = (fieldId: string): void => {
    const val = fieldValues[fieldId]?.value ?? '';
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], hasError: val.length < 4 },
    }));
  };

  // ─── goToCompleted ────────────────────────────────────────────────────

  const goToCompleted = async (): Promise<void> => {
    Keyboard.dismiss();
    if (!isFormValid()) return;

    setLoading(true);
    try {
      const formValues: Record<string, string> = {};
      fields.forEach((f) => {
        formValues[f.fieldId] = fieldValues[f.fieldId]?.value ?? '';
      });

      const newUVAResponse = await SetupRacimoService.createNewUVA();
      const updateUVAResponse = await SetupRacimoService.updateUVA(
        JSON.stringify(formValues),
      );

      if (newUVAResponse && updateUVAResponse) {
        navigation.navigate('RegisterCompleted');
      } else {
        navigation.navigate('RegisterProjectForm', { racimoCode: '' });
      }
    } catch (err) {
      console.error('goToCompleted error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (initializing) {
    return (
      <LinearGradient
        colors={[theme.colors.blue[500], theme.colors.blue[700]]}
        style={styles.gradient}
        testID="register-project-form-init"
      >
        <View style={styles.card}>
          <ActivityIndicator color={theme.colors.blue[500]} size="large" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="register-project-form-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Branding logo or default */}
          {brandingLogo ? (
            <Image
              source={{ uri: brandingLogo }}
              style={styles.brandLogo}
              resizeMode="contain"
              testID="brand-logo"
            />
          ) : (
            <Image
              source={require('@/assets/png/icon-only.png') as number}
              style={styles.logo}
              resizeMode="contain"
            />
          )}

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
            Datos de ubicación
          </Text>

          {/* Message with user name */}
          <Text
            style={[
              styles.message,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.colors.gray[700],
              },
            ]}
          >
            {userName
              ? `${userName} por favor completa los siguientes datos:`
              : 'Por favor completa los siguientes datos:'}
          </Text>

          {/* Dynamic fields */}
          {fields.length === 0 && (
            <Text
              style={[
                styles.emptyText,
                { fontFamily: fontFamilyForWeight('400'), color: theme.colors.gray[500] },
              ]}
              testID="no-fields-message"
            >
              No hay campos disponibles para este proyecto.
            </Text>
          )}

          {fields.map((field) => (
            <View key={field.fieldId} style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    fontFamily: fontFamilyForWeight('500'),
                    color: theme.colors.gray[700],
                  },
                ]}
              >
                {field.displayText}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: fieldValues[field.fieldId]?.hasError
                      ? theme.colors.danger
                      : theme.colors.blue[500],
                    backgroundColor: theme.colors.gray[50],
                    color: theme.colors.gray[800],
                    fontFamily: fontFamilyForWeight('400'),
                  },
                ]}
                placeholder={field.displayText}
                placeholderTextColor={theme.colors.gray[400]}
                value={fieldValues[field.fieldId]?.value ?? ''}
                onChangeText={(t) => handleFieldChange(field.fieldId, t)}
                onBlur={() => handleFieldBlur(field.fieldId)}
                onSubmitEditing={() => {
                  if (isFormValid()) Keyboard.dismiss();
                }}
                testID={`field-${field.fieldId}`}
              />
            </View>
          ))}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.blue[700],
                opacity: isFormValid() ? 1 : 0.4,
              },
            ]}
            onPress={() => void goToCompleted()}
            disabled={!isFormValid() || loading}
            testID="submit-button"
            accessibilityRole="button"
            accessibilityState={{ disabled: !isFormValid() || loading }}
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
  brandLogo: {
    width: 120,
    height: 60,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 14,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
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

export default RegisterProjectFormScreen;
