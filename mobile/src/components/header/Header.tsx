/**
 * B11 — HeaderComponent
 *
 * Ported from: src/app/components/header/header.component.ts + .html
 * Classification: Major adaptation
 *
 * Decision (§4.4 / open question #8):
 *   The `goBack` logout dead branch is ELIMINATED (not implemented).
 *   Rationale: it was dead code (no-op in original — the 'if (url == "/login")' block
 *   was empty). Eliminating avoids porting dead logic; documented here as decision.
 *   If logout from header is needed in the future, it should be wired to AuthContext.
 *
 * Changes from original:
 *   - Angular @Component / @Injectable / Router / ChangeDetectorRef removed
 *   - DataStore dependency removed: seed passed as prop (§R-29 decoupling)
 *   - If seed is not provided, caller can pass it via prop (no internal DataStore fetch)
 *   - goToProfile() → onProfilePress callback prop (navigation decoupled from component)
 *   - goBack(url) → onBackPress callback prop
 *   - ion-header/ion-toolbar → React Navigation SafeAreaView + View
 *   - ion-chip → custom chip layout
 *   - ion-icon (arrow-back-outline) → Ionicons "arrow-back-outline" from @expo/vector-icons (pixel-perfect r2 fix)
 *   - Other ion-icons → SVG components
 *
 * Preserved contracts:
 *   - title, seed, hasBackButton, routerBackButton, hasProfileButton, hasCenterTitle props
 *   - seed shown with semilla icon next to user avatar chip
 *
 * Visual parity fixes (home feature audit):
 *   - chip backgroundColor: --Colors-Blue-100 = #D1FBFC (was rgba(255,255,255,0.15))
 *   - seedText color: --Colors-Blue-700 = #14788A (was white)
 *   - UserCircleIcon color: --Colors-Blue-700 (was white)
 *   - SemillaIcon: no color prop — semilla.svg uses gradient fills (orange/brown)
 *     that match the original <ion-icon src="semilla.svg"> which renders as-is (no tint)
 *   - chip height: 40px; borderRadius: 18px (original ion-chip sizing)
 *
 * Risks: R-29
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Icon imports ──────────────────────────────────────────────────────────────

import SemillaIcon from '@/assets/svg/icons/semilla.svg';
import UserCircleIcon from '@/assets/svg/icons/user-circle.svg';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface HeaderProps {
  /** Title displayed in the header */
  title?: string;
  /**
   * Seed count shown in the user chip.
   * Passed from the parent (decoupled from DataStore — R-29 fix).
   *
   * `null` / `undefined` means NOT LOADED YET and renders NO number at all — the
   * original is `<ion-label>{{ seed }} </ion-label>`, which interpolates to an empty
   * label while `seed` is undefined. Compare docs/evidence/home/screen-10-header.png
   * (chip 73px wide, no digit) with screen-16-header-seed-count.png (84px, "0"):
   * substituting 0 for "unknown" made the chip flash 0 → real value on entry.
   */
  seed?: number | null;
  /** Whether to show the back button */
  hasBackButton?: boolean;
  /** Whether to show the profile/user chip */
  hasProfileButton?: boolean;
  /** Whether to center the title */
  hasCenterTitle?: boolean;
  /**
   * Called when back button is pressed.
   * Replaces goBack(url) — navigation is handled by the caller (R-29).
   */
  onBackPress?: () => void;
  /**
   * Called when the profile chip is pressed.
   * Replaces goToProfile() — navigation is handled by the caller (R-29).
   */
  onProfilePress?: () => void;
  /**
   * Optional trailing slot (ion-buttons slot="end" in the per-page headers of
   * profile.page.html / alerts.page.html). Rendered where the user chip would
   * be, so pages that own a bell / settings action reuse THIS header (and its
   * status-bar inset) instead of painting their own toolbar (device F-14, D1, D-02).
   * Ignored when `hasProfileButton` is true — the original never shows both.
   */
  rightAction?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Header
 *
 * App header bar with optional back button, title, and user chip.
 * Decoupled from DataStore and Router — receives all data via props.
 *
 * @example
 *   <Header
 *     title="Inicio"
 *     seed={userProgress?.Seed}
 *     hasBackButton={false}
 *     hasProfileButton
 *     onProfilePress={() => navigation.navigate('Profile')}
 *   />
 */
export function Header({
  title = 'Inicio',
  seed = null,
  hasBackButton = false,
  hasProfileButton = true,
  hasCenterTitle = false,
  onBackPress,
  onProfilePress,
  rightAction,
}: HeaderProps): React.JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const topPadding = insets.top + (Platform.OS === 'android' ? 0 : 0);

  // Not `seed ?? 0`: an unresolved seed must render nothing (see the `seed` prop doc).
  const hasSeed = seed !== null && seed !== undefined;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.blue[500],
          paddingTop: topPadding + 8,
        },
      ]}
      testID="header"
    >
      <View style={[styles.toolbar, hasCenterTitle && styles.toolbarCenter]}>
        {/* Back button — ion-icon name="arrow-back-outline" (header.component.html:7) */}
        {hasBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            testID="header-back-btn"
          >
            <Ionicons name="arrow-back-outline" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        )}

        {/* Title */}
        {/* D-06 — the title is NOT bold. Original: `.header .title { @include
            text_base(18px, 600) }` (header.component.scss:13), i.e. Montserrat SemiBold.
            RN was painting Montserrat-Bold (docs/evidence/device-2026-09-07/05-home.png
            vs docs/evidence/home/screen-10-header.png). */}
        <Text
          style={[
            styles.title,
            { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
            hasCenterTitle && styles.titleCenter,
          ]}
          numberOfLines={1}
          testID="header-title"
        >
          {title}
        </Text>

        {/* User chip with seed */}
        {/* Original ion-chip: --background: --Colors-Blue-100 = #D1FBFC;
            color: --Colors-Blue-700 = #14788A; height: 40px; border-radius: 18px */}
        {hasProfileButton && (
          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: theme.colors.blue[100] },
            ]}
            onPress={onProfilePress}
            testID="header-profile-btn"
          >
            {hasSeed && (
              <Text
                style={[
                  styles.seedText,
                  {
                    fontFamily: fontFamilyForWeight('700'),
                    color: theme.colors.blue[700],
                  },
                ]}
                testID="header-seed"
              >
                {seed}
              </Text>
            )}
            {/* semilla.svg has hardcoded gradient fills (orange/brown oval seed shape).
                Original: <ion-icon src="semilla.svg"> renders without any color tint.
                No color prop here — gradient fills must not be overridden. */}
            <SemillaIcon width={16} height={16} />
            <UserCircleIcon width={40} height={40} color={theme.colors.blue[700]} />
          </TouchableOpacity>
        )}

        {/* Trailing slot — ion-buttons slot="end" (profile/alerts per-page headers) */}
        {!hasProfileButton && rightAction ? rightAction : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 8,
    // Original .header { justify-content: space-between } (header.component.scss:5):
    // with back+title (no chip) the title sits at the right edge — matches
    // docs/evidence/historical/screen-12 (measurement detail).
    justifyContent: 'space-between',
  },
  toolbarCenter: {
    justifyContent: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  title: {
    // Original .title is a plain <p> (no flex-grow); space-between positions it.
    flexShrink: 1,
    fontSize: 18,
  },
  titleCenter: {
    textAlign: 'center',
    flex: 0,
    flexShrink: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,       // original: ion-chip height 40px
    borderRadius: 18, // original: ion-chip border-radius 18px
    paddingHorizontal: 10,
    gap: 4,
  },
  seedText: {
    fontSize: 16, // ion-label font-size:16 (header.component.scss:38-40)
  },
});

export default Header;
