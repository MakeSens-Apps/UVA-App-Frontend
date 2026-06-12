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
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import type { AppTabsParamList, HomeStackParamList } from './types';
import { colors, fontFamilyForWeight } from '@/theme/theme';

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

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
//
// Renders the pill indicator (borderRadius:14, bg:blue[200], height:56) on the
// active tab, matching global.scss:327-331 .tab-selected rules.

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; active: IoniconName; inactive: IoniconName }> = {
  HomeStack:   { label: 'Inicio',    active: 'home',        inactive: 'home-outline' },
  Measurement: { label: 'Registrar', active: 'add-circle',  inactive: 'add-circle-outline' },
  Historical:  { label: 'Historial', active: 'bar-chart',   inactive: 'bar-chart-outline' },
};

function UvaTabBar({ state, descriptors, navigation }: BottomTabBarProps): React.JSX.Element {
  // Only render the 3 visible tabs; Profile is excluded (not present in TAB_CONFIG)
  const visibleRoutes = state.routes.filter(
    (r) => TAB_CONFIG[r.name] !== undefined,
  );

  return (
    <View style={tabBarStyles.container} testID="tab-bar">
      {visibleRoutes.map((route) => {
        const cfg = TAB_CONFIG[route.name];
        if (!cfg) return null;

        const isFocused = state.index === state.routes.indexOf(route);
        const iconName: IoniconName = isFocused ? cfg.active : cfg.inactive;
        // active: --Colors-Blue-700 (#14788A); inactive: --Colors-Gray-50 (#FAFAFA)
        const tintColor = isFocused ? colors.blue[700] : colors.gray[50];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key]?.options?.tabBarAccessibilityLabel}
            testID={descriptors[route.key]?.options?.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={tabBarStyles.tab}
          >
            {/* Pill background only on active tab — global.scss:327-331 */}
            <View
              style={[
                tabBarStyles.pill,
                isFocused && tabBarStyles.pillActive,
              ]}
            >
              <Ionicons name={iconName} size={24} color={tintColor} />
              <Text
                style={[
                  tabBarStyles.label,
                  {
                    color: tintColor,
                    fontFamily: fontFamilyForWeight(isFocused ? '700' : '500'),
                  },
                ]}
              >
                {cfg.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
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

// ─── Tab bar styles ───────────────────────────────────────────────────────────

const tabBarStyles = StyleSheet.create({
  container: {
    // ion-tab-bar: background:#10BCCA, height:82px (global.scss:304, 306)
    flexDirection: 'row',
    backgroundColor: colors.blue[500],
    height: 82,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  pill: {
    // Default state: transparent pill container, centered
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    height: 56,
    gap: 2,
  },
  pillActive: {
    // .tab-selected: border-radius:14, background:--Colors-Blue-200 (#A9F5F8), height:56
    // global.scss:327-331
    backgroundColor: colors.blue[200],
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default AppTabs;
