/**
 * B12 — AppStack
 *
 * Native stack navigator for authenticated flows.
 * Wraps AppTabs as the root screen, plus full-screen sub-screens and modals.
 *
 * Modal group (presentation: 'modal'):
 *   - ModalAlert
 *
 * Portability matrix: Sistema de rutas/navegación → App stack → B12
 * Risks: R-15, R-17, R-18
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AppStackParamList } from './types';
import { AppTabs } from './AppTabs';

import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { PersonalInfoScreen } from '@/screens/profile/PersonalInfoScreen';
import { AchievementScreen } from '@/screens/profile/AchievementScreen';
import { AlertsScreen } from '@/screens/profile/AlertsScreen';
import { ConfigurationScreen } from '@/screens/configuration/ConfigurationScreen';
import { GuideMeasurementScreen } from '@/screens/measurement/GuideMeasurementScreen';
import { RegisterMeasurementScreen } from '@/screens/measurement/RegisterMeasurementScreen';
import { MeasurementDetailScreen } from '@/screens/historical/MeasurementDetailScreen';
import { ModalAlertScreen } from '@/screens/ModalAlertScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Root: bottom tabs */}
      <Stack.Screen name="AppTabs" component={AppTabs} />

      {/* Profile — pushed page WITHOUT the tab bar.
          Original app.routes.ts:95 declares `/profile` at the root level, not under
          `/app/tabs`, so no ion-tabs shell is rendered underneath it
          (docs/evidence/profile/screen-01, screen-02: the page background runs all the
          way down to the ISAGEN + Fundación Natura logos). Device D2 / D-18. */}
      <Stack.Screen name="Profile" component={ProfileScreen} />

      {/* Profile sub-screens */}
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Achievement" component={AchievementScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Configuration" component={ConfigurationScreen} />
      <Stack.Screen name="SyncAction" component={ConfigurationScreen} />

      {/* Measurement sub-screens */}
      {/* GuideMeasurement is the original's ion-modal sheet
          (register-measurement.page.ts:199-227 — initialBreakpoint: 1,
          breakpoints: [0, 1]), presented OVER the register page so its header
          stays visible above the sheet — docs/evidence/measurement/screen-03.
          `transparentModal` reproduces that; the sheet itself offsets its top by
          the status-bar inset + header height (device bug F-11: the close button
          used to sit under the status bar). `replace` still works from a
          transparent modal, so the nextGuide chain is unaffected. */}
      <Stack.Screen
        name="GuideMeasurement"
        component={GuideMeasurementScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="RegisterMeasurement" component={RegisterMeasurementScreen} />

      {/* Historical sub-screens */}
      <Stack.Screen name="MeasurementDetail" component={MeasurementDetailScreen} />

      {/* Modal group (B12 gate: modal abre/cierra) */}
      <Stack.Screen
        name="ModalAlert"
        component={ModalAlertScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

export default AppStack;
