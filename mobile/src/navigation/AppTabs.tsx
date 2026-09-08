/**
 * B12 — AppTabs
 *
 * Bottom tab navigator (3 visible tabs; Profile hidden — accessible from Header chip).
 * Tab icons use @expo/vector-icons Ionicons (replaces addIcons, R-47).
 *
 * Tab structure:
 *   - HomeStack (stack inside tab):
 *       Home (tab visible)
 *       MoonPhase (hidden — navigated to from Home)
 *   - Measurement tab
 *   - Historical tab
 *   - Profile (hidden from tab bar — accessed via Header chip → AppStack)
 *
 * Visual parity (global.scss):
 *   - background: --Colors-Blue-500 (#10BCCA)          global.scss:304
 *   - inactive tint: --Colors-Gray-50 (#FAFAFA)         global.scss:305
 *   - active tint: --Colors-Blue-700 (#14788A)          global.scss:315
 *   - height: 82px                                       global.scss:306
 *   - active tab pill: borderRadius:14, bg:blue[200] (#A9F5F8), height:56  global.scss:327-331
 *
 * Portability matrix: TabsPage shell → createBottomTabNavigator → B12
 * Risks: R-06, R-24, R-47, R-15
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AppTabsParamList, HomeStackParamList } from './types';
import { UvaTabBar } from './UvaTabBar';

import { HomeScreen } from '@/screens/home/HomeScreen';
import { MoonPhaseScreen } from '@/screens/moon/MoonPhaseScreen';
import { DevGateScreen } from '@/screens/dev/DevGateScreen';
import { MeasurementScreen } from '@/screens/measurement/MeasurementScreen';
import { HistoricalScreen } from '@/screens/historical/HistoricalScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';

// ─── HomeStack (Home + hidden MoonPhase) ──────────────────────────────────────

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator(): React.JSX.Element {
  return (
    <HomeStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      {/* MoonPhase is hidden from tabs — accessible via navigation.navigate('MoonPhase') */}
      <HomeStack.Screen name="MoonPhase" component={MoonPhaseScreen} />
      {/* DevGate — only in dev builds, for visual integration gates */}
      {__DEV__ && <HomeStack.Screen name="DevGate" component={DevGateScreen} />}
    </HomeStack.Navigator>
  );
}

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────

const Tabs = createBottomTabNavigator<AppTabsParamList>();

export function AppTabs(): React.JSX.Element {
  return (
    <Tabs.Navigator
      tabBar={(props) => <UvaTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ title: 'Inicio' }}
      />
      <Tabs.Screen
        name="Measurement"
        component={MeasurementScreen}
        options={{ title: 'Registrar' }}
      />
      <Tabs.Screen
        name="Historical"
        component={HistoricalScreen}
        options={{ title: 'Historial' }}
      />
      {/*
       * Profile is hidden from the tab bar (accessed via Header chip).
       * Original Ionic has only 3 ion-tab-buttons (home / measurement / historical).
       * We keep the Screen registered for navigation but exclude it from UvaTabBar
       * by omitting it from TAB_CONFIG.
       */}
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tabs.Navigator>
  );
}

export default AppTabs;
