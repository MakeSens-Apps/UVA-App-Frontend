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
 * Visual ref: docs/evidence/register/screen-14 + docs/evidence/auth-login/screen-05
 *   The original is `<app-explore-container title="Vinculando al proyecto">` with a
 *   loader.gif and a solid uva_green-700 "Cancelar" button
 *   (validate-project.page.html:1-9), i.e. the SAME frosted card as the login screen:
 *   centered vertically, ~90 % wide, white 0.3→0.8 gradient, radius 20, circular badge.
 *   RN previously painted an opaque white card of its own (device D3).
 *
 * Navigation:
 *   Success → ProjectVinculationDone { racimoCode, racimoName? }
 *   Failure → ProjectVinculation (pop back)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ExploreContainer } from '@/components/explore-container/ExploreContainer';
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
    // Original: routerLink="/register/project-vinculation" (validate-project.page.html:8)
    // Cancel returns to project-vinculation, not Login
    navigation.navigate('ProjectVinculation');
  };

  return (
    <ExploreContainer title={statusMessage}>
      {/* .loader { width: 78px } (global.scss:191-193) — loader.gif, not a spinner */}
      <Image
        source={require('@/assets/gifs/loader.gif') as number}
        style={styles.loader}
        resizeMode="contain"
        testID="loading-spinner"
      />

      {/* ion-button expand="block" color="uva_green-700" (validate-project.page.html:3-8) */}
      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: theme.colors.blue[700] }]}
        onPress={cancelTimer}
        testID="cancel-button"
      >
        <Text
          style={[
            styles.cancelText,
            { fontFamily: fontFamilyForWeight('500') },
          ]}
        >
          Cancelar
        </Text>
      </TouchableOpacity>
    </ExploreContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  cancelText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default ValidateProjectScreen;
