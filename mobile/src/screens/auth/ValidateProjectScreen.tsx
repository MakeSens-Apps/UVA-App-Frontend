/**
 * B14 — ValidateProjectScreen (REAL implementation — closes B13c hole)
 *
 * Ported from: src/app/pages/auth/register/validate-project/validate-project.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic (exact port of startTimerAndDownload):
 *   1. Start a 2s timer Promise in parallel with:
 *      - config.downLoadData()           (downloads config from S3)
 *      - MoonPhaseService.downloadAndStoreMoonPhaseData()  (24 months of lunar phases — ENOENT fix)
 *   2. Wait for all 3 (Promise.all([timer, downloadConfig, downloadMoon]))
 *   3. If both downloads succeed + timer done:
 *      - config.loadBranding() → ThemeContext updated
 *      - navigate to ProjectVinculationDone { racimoCode, racimoName }
 *   4. If either download fails → navigate back to ProjectVinculation
 *
 * This closes the B13c gap (ENOENT for lunar-phases): lunar data is stored during
 * the validate-project step before the user reaches HomeScreen.
 *
 * B14 specifics:
 *   - __DEV__ bypass ELIMINATED (this is the real implementation)
 *   - Gets racimoCode from route.params.racimoCode
 *   - Loads racimoName from session after getRACIMOByID if needed
 *
 * Visual ref: docs/evidence/register/screen-14
 *   - Loader screen: logo, text "Vinculando al proyecto", spinner, "Cancelar" button
 *
 * Navigation:
 *   Success → ProjectVinculationDone { racimoCode, racimoName? }
 *   Failure → ProjectVinculation (pop back)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { MoonPhaseService } from '@/domain/moon/moon-phase';
import { SetupService } from '@/domain/setup/setup';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'ValidateProject'>;

const MIN_DISPLAY_MS = 2000;

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidateProjectScreen({ route, navigation }: Props): React.JSX.Element {
  const { racimoCode } = route.params;
  const { theme } = useTheme();
  const [statusMessage, setStatusMessage] = useState('Vinculando al proyecto');

  const { downLoadData, loadBranding } = useConfigContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const startTimerAndDownload = async (): Promise<void> => {
      // 2s minimum display timer
      const timerPromise = new Promise<void>((resolve) => {
        timerRef.current = setTimeout(resolve, MIN_DISPLAY_MS);
      });

      // Download in parallel
      const downloadConfigPromise = downLoadData();
      const downloadMoonPromise = MoonPhaseService.downloadAndStoreMoonPhaseData();

      const [downloadConfig, downloadMoon] = await Promise.all([
        downloadConfigPromise,
        downloadMoonPromise,
      ]);

      // Wait for minimum display
      await timerPromise;

      if (cancelledRef.current) return;

      const configOk = downloadConfig;
      const moonOk = downloadMoon.success;

      if (configOk && moonOk) {
        setStatusMessage('Cargando configuración...');
        await loadBranding();

        // Get racimoName from session (set by getRACIMOByCode in ProjectVinculationScreen)
        const session = await SetupService.getParametersUser();
        const racimoName = session.racimoName ?? undefined;

        if (!cancelledRef.current) {
          navigation.navigate('ProjectVinculationDone', { racimoCode, racimoName });
        }
      } else {
        if (!cancelledRef.current) {
          navigation.goBack(); // → ProjectVinculation
        }
      }
    };

    void startTimerAndDownload();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [racimoCode, downLoadData, loadBranding, navigation]);

  const cancelTimer = (): void => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    navigation.navigate('Login');
  };

  return (
    <LinearGradient
      colors={[theme.colors.blue[500], theme.colors.blue[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="validate-project-screen"
    >
      <View style={styles.card}>
        {/* Logo */}
        <Image
          source={require('@/assets/png/icon-only.png') as number}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Status text */}
        <Text
          style={[
            styles.statusText,
            {
              fontFamily: fontFamilyForWeight('600'),
              color: theme.colors.blue[800],
            },
          ]}
          testID="status-text"
        >
          {statusMessage}
        </Text>

        {/* Spinner */}
        <ActivityIndicator
          color={theme.colors.blue[500]}
          size="large"
          testID="loading-spinner"
        />

        {/* Cancelar button */}
        <TouchableOpacity onPress={cancelTimer} testID="cancel-button">
          <Text
            style={[
              styles.cancelText,
              {
                fontFamily: fontFamilyForWeight('500'),
                color: theme.colors.gray[600],
              },
            ]}
          >
            Cancelar
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
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
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 20,
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
  },
  statusText: {
    fontSize: 18,
    textAlign: 'center',
  },
  cancelText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});

export default ValidateProjectScreen;
