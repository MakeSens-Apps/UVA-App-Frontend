/**
 * B12 — AppTabs
 *
 * Bottom tab navigator (3 visible tabs + moon-phase hidden in the HomeStack).
 * Tab icons use @expo/vector-icons Ionicons (replaces addIcons, R-47).
 *
 * Tab structure:
 *   - HomeStack (stack inside tab):
 *       Home (tab visible)
 *       MoonPhase (hidden — navigated to from Home)
 *   - Measurement tab
 *   - Historical tab
 *   - Profile tab
 *
 * Portability matrix: TabsPage shell → createBottomTabNavigator → B12
 * Risks: R-06, R-24, R-47, R-15
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { AppTabsParamList, HomeStackParamList } from './types';

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

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  HomeStack: { active: 'home', inactive: 'home-outline' },
  Measurement: { active: 'add-circle', inactive: 'add-circle-outline' },
  Historical: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export function AppTabs(): React.JSX.Element {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName: IoniconName = icons
            ? (focused ? icons.active : icons.inactive)
            : 'ellipse-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1a4a7a',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#fff' },
      })}
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
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tabs.Navigator>
  );
}

export default AppTabs;
