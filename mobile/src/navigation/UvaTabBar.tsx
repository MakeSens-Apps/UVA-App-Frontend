/**
 * UvaTabBar — the custom bottom tab bar for AppTabs.
 *
 * Extracted from AppTabs so it can be rendered in isolation: AppTabs pulls in every
 * screen (and therefore Amplify/DataStore), which made the tab bar untestable.
 * This module depends only on the theme and the three tab icons.
 *
 * Visual parity (global.scss):
 *   - background: --Colors-Blue-500 (#10BCCA)          global.scss:304
 *   - inactive tint: --Colors-Gray-50 (#FAFAFA)         global.scss:305
 *   - active tint: --Colors-Blue-700 (#14788A)          global.scss:315
 *   - height: 82px                                       global.scss:306
 *   - active tab pill: borderRadius:14, bg:blue[200] (#A9F5F8), height:56  global.scss:327-331
 *
 * Risks: R-05, R-47
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ClipboardCheckIcon from '@/assets/svg/icons/clipboard-check.svg';
import CalendarIcon from '@/assets/svg/icons/calendar.svg';
import HomeIcon from '@/assets/svg/icons/home.svg';

import { fontFamilyForWeight } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
//
// Renders the pill indicator (borderRadius:14, bg:blue[200], height:56) on the
// active tab, matching global.scss:327-331 .tab-selected rules.

// Measurement and Historical tabs use the original custom SVG icons (not Ionicons).
// Original Ionic tabs.page.html:
//   Registrar → assets/images/icons/clipboard-check.svg
//   Historial  → assets/images/icons/calendar.svg
// Other tabs use Ionicons as before.
// All three tabs use the original custom SVG icons (not Ionicons).
// Original Ionic tabs.page.html:
//   Inicio     → assets/images/icons/home.svg
//   Registrar  → assets/images/icons/clipboard-check.svg
//   Historial  → assets/images/icons/calendar.svg
// global.scss:322-325: ion-icon { width: 20px; height: 20px }
/** ion-tab-bar height (global.scss:306) — the visual height, excluding safe-area inset. */
const TAB_BAR_HEIGHT = 82;

type SvgTabIcon = 'home' | 'clipboard-check' | 'calendar';
const TAB_CONFIG: Record<string, { label: string; svgIcon: SvgTabIcon }> = {
  HomeStack:   { label: 'Inicio',    svgIcon: 'home' },
  Measurement: { label: 'Registrar', svgIcon: 'clipboard-check' },
  Historical:  { label: 'Historial', svgIcon: 'calendar' },
};

const SVG_TAB_ICONS: Record<SvgTabIcon, React.ElementType> = {
  'home': HomeIcon,
  'clipboard-check': ClipboardCheckIcon,
  'calendar': CalendarIcon,
};

export function UvaTabBar({ state, descriptors, navigation }: BottomTabBarProps): React.JSX.Element {
  // Migrated from static `colors` import to useTheme() so RACIMO branding
  // overrides propagate to the tab bar at runtime (fix R-05).
  const { theme } = useTheme();

  // Edge-to-edge (targetSdk 36 / RN 0.85): the Android system navigation bar is
  // drawn ON TOP of the app window, so a bottom bar with a fixed height ends up
  // underneath the 3-button nav bar. @react-navigation/bottom-tabs applies the
  // inset automatically only to its DEFAULT tab bar — this is a custom `tabBar`,
  // so the inset must be applied by hand.
  // The visual height of the original Ionic tab bar (82px) is preserved: the
  // inset is ADDED below it as extra padding, not subtracted from it.
  const insets = useSafeAreaInsets();

  // Only render the 3 visible tabs; Profile is excluded (not present in TAB_CONFIG)
  const visibleRoutes = state.routes.filter(
    (r) => TAB_CONFIG[r.name] !== undefined,
  );

  return (
    <View
      style={[
        tabBarStyles.container,
        {
          backgroundColor: theme.colors.blue[500],
          // 82px of tab bar + the system nav bar inset underneath it.
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: tabBarStyles.container.paddingBottom + insets.bottom,
        },
      ]}
      testID="tab-bar"
    >
      {visibleRoutes.map((route) => {
        const cfg = TAB_CONFIG[route.name];
        if (!cfg) return null;

        const isFocused = state.index === state.routes.indexOf(route);
        // active: --Colors-Blue-700 (#14788A); inactive: --Colors-Gray-50 (#FAFAFA)
        const tintColor = isFocused
          ? (theme.colors.blue[700] as string)
          : (theme.colors.gray[50] as string);

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
                isFocused && { backgroundColor: theme.colors.blue[200] as string },
              ]}
            >
              {/* Original: ion-icon width=20px height=20px (global.scss:322-325) */}
              {(() => {
                const SvgIcon = SVG_TAB_ICONS[cfg.svgIcon];
                return <SvgIcon width={20} height={20} color={tintColor} />;
              })()}
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

// ─── Tab bar styles ───────────────────────────────────────────────────────────

const tabBarStyles = StyleSheet.create({
  container: {
    // ion-tab-bar: background:#10BCCA, height:82px (global.scss:304, 306)
    // backgroundColor is applied dynamically via inline style (R-05 branding fix).
    // height/paddingBottom are overridden at runtime to add the safe-area bottom
    // inset (Android edge-to-edge nav bar) — see UvaTabBar.
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
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
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});

