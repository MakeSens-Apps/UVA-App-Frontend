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
 *     and the FULL width of the tab button (the rule is on `ion-tab-button.tab-selected`
 *     itself) — docs/evidence/home/screen-04-tab-bar.png x=10..122 of 360 (D-07)
 *   - label weight: 500 on every tab, selected included (global.scss:317) — D-07
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
              testID={`tab-pill-${route.name}`}
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
              {/* D-07 — labels are NOT bolded on the active tab. The original styles
                  EVERY `ion-tab-button` with `@include text_base(14px, 500)`
                  (global.scss:317); `--color-selected` changes the COLOUR only. */}
              <Text
                testID={`tab-label-${route.name}`}
                style={[
                  tabBarStyles.label,
                  {
                    color: tintColor,
                    fontFamily: fontFamilyForWeight('500'),
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
    // ion-tab-bar { padding-inline: 10px } (global.scss:307)
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  pill: {
    // D-07 — the pill is the WHOLE tab button, not a content-hugging capsule:
    // `.tab-selected` sets background/border-radius on the `ion-tab-button` itself,
    // which is a flex child of the bar. Measured on docs/evidence/home/screen-04-tab-bar.png
    // (360×83): the active background runs x=10..122 → 113px = (360 − 2×10) / 3, and
    // y=14..69 → the 56px height below. `alignSelf: 'stretch'` reproduces that; the
    // previous paddingHorizontal:12 capsule was the "pill más estrecho" of the review.
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 14,
    height: 56,
    gap: 2,
  },
  label: {
    fontSize: 14, // global.scss:317 text_base(14px, 500)
    marginTop: 2,
  },
});

