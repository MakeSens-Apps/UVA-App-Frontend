/**
 * RegistrationLockNotice (F4-05, #60 — ADR-005).
 *
 * The single notice at the top of Home and Measurement:
 *   - UVA disabled: warning, no reason and no request button.
 *   - Update required: warning with an "Actualizar" button that opens the store.
 *   - Reactivated: green notice, shown once (the caller decides when).
 * Visual language: the global `.alert` card used in MeasurementDetail (orange for warnings,
 * green like the completed-tasks group).
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { openAppStoreListing } from '@/native/device/appVersion';
import type { RegistrationLockReason } from '@/domain/registration-lock/registration-lock';

export const UVA_DISABLED_MESSAGE =
  'Tu estación fue deshabilitada por el administrador de tu RACIMO. Puedes ver tu histórico. Si crees que es un error, comunícate con él.';
export const UPDATE_REQUIRED_MESSAGE =
  'Actualiza la app para seguir registrando';
export const UVA_REACTIVATED_MESSAGE =
  'Tu estación fue reactivada, ya puedes registrar';

/** Text for each lock reason (also used by the toast when saving is refused). */
export const LOCK_MESSAGES: Record<RegistrationLockReason, string> = {
  'uva-disabled': UVA_DISABLED_MESSAGE,
  'update-required': UPDATE_REQUIRED_MESSAGE,
};

interface Props {
  reason: RegistrationLockReason | null;
  showReactivated: boolean;
  testID?: string;
}

export function RegistrationLockNotice({
  reason,
  showReactivated,
  testID = 'registration-lock-notice',
}: Props): React.JSX.Element | null {
  const { theme } = useTheme();

  if (reason) {
    return (
      <View
        style={[
          styles.alert,
          {
            backgroundColor: theme.colors.orange[100],
            borderColor: theme.colors.orange[400],
          },
        ]}
        accessibilityRole="alert"
        testID={`${testID}-${reason}`}
      >
        <Text
          style={[
            styles.text,
            {
              fontFamily: fontFamilyForWeight('500'),
              color: theme.colors.gray[700],
            },
          ]}
        >
          {LOCK_MESSAGES[reason]}
        </Text>
        {reason === 'update-required' && (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.orange[500] },
            ]}
            onPress={() => {
              void openAppStoreListing().catch((error: unknown) => {
                console.error('Error opening the store', error);
              });
            }}
            accessibilityRole="button"
            testID={`${testID}-update-button`}
          >
            <Text
              style={[
                styles.buttonText,
                { fontFamily: fontFamilyForWeight('500') },
              ]}
            >
              Actualizar
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (showReactivated) {
    return (
      <View
        style={[
          styles.alert,
          {
            backgroundColor: theme.colors.green[100],
            borderColor: theme.colors.green[200],
          },
        ]}
        accessibilityRole="alert"
        testID={`${testID}-reactivated`}
      >
        <Text
          style={[
            styles.text,
            {
              fontFamily: fontFamilyForWeight('500'),
              color: theme.colors.green[700],
            },
          ]}
        >
          {UVA_REACTIVATED_MESSAGE}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // global .alert (radius 14, border 1) with the 10px gutter of `.cards`
  alert: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginHorizontal: 10,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
