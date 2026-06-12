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

      {/* Profile sub-screens */}
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Achievement" component={AchievementScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Configuration" component={ConfigurationScreen} />
      <Stack.Screen name="SyncAction" component={ConfigurationScreen} />

      {/* Measurement sub-screens */}
      <Stack.Screen name="GuideMeasurement" component={GuideMeasurementScreen} />
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
