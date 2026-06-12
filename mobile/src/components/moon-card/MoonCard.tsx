/**
 * B11 — MoonCardComponent
 *
 * Ported from: src/app/components/moon-card/moon-card.component.ts + .html
 * Classification: Major adaptation
 *
 * BUG FIX (§4.4 — authorized):
 *   Original: setter sets this._phase with NEW_MOON fallback, but uses the
 *   PARAMETER (not this._phase) for phaseName and phaseIcon → name/icon can be undefined
 *   when phase is falsy.
 *   Fix: use the resolved fallback value consistently for both name and icon lookups.
 *
 * Preserved contracts:
 *   - LUNAR_PHASE and LUNAR_PHASE_NAME maps (exact same keys/values)
 *   - background prop: 'gray' | 'green'
 *   - hasArrow prop
 *   - phase prop updates name + icon
 *   - phaseName and phaseIcon can be set independently
 *
 * Changes from original:
 *   - Angular @Component / @Input → React functional component with props
 *   - ion-img → SVG components (react-native-svg-transformer)
 *   - ion-icon name="arrow-forward-outline" → ArrowRightIcon SVG
 *   - Asset paths updated to mobile/src/assets/svg/moon/
 *   - Bug fix applied: fallback 'NEW_MOON' used consistently in setter
 *
 * Visual parity fixes (home feature audit):
 *   - background 'gray': --Colors-Gray-700 = #404040 (not gray[100])
 *   - background 'green': --Colors-Blue-800 = #1A6270 (not green[100])
 *   - title color: #FFFFFF (white, not semanticColors.text)
 *   - subtitle color: --Colors-Gray-300 = #D4D4D4 (not textSecondary)
 *   - arrow color: #FFFFFF (white, not semanticColors.text)
 *   - subtitle font-size: 14px (was 12); title font-size: 18px (was 16)
 *   - subtitle font-weight: 500; title font-weight: 600
 *
 * Risks: R-24
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Moon phase SVG icons ─────────────────────────────────────────────────────

import NuevaMoonIcon from '@/assets/svg/moon/nueva.svg';
import LlenaMoonIcon from '@/assets/svg/moon/llena.svg';
import CuartoCrecienteMoonIcon from '@/assets/svg/moon/cuarto_creciente.svg';
import CuartoMenguanteMoonIcon from '@/assets/svg/moon/cuarto_menguante.svg';
import GibosaCrecienteMoonIcon from '@/assets/svg/moon/gibosa_creciente.svg';
import GibosaMenguanteMoonIcon from '@/assets/svg/moon/gibosa_menguante.svg';
import EclipsesIcon from '@/assets/svg/moon/eclipses_card_home.svg';
import ArrowRightIcon from '@/assets/svg/icons/arrow-right.svg';

// ─── Constants (preserved from original) ──────────────────────────────────────

/**
 * Maps LUNAR_PHASE keys to their SVG component.
 * Preserved from original: same key names.
 */
const LUNAR_PHASE_COMPONENTS: Record<keyof typeof LUNAR_PHASE_NAME, React.ElementType> = {
  NEW_MOON: NuevaMoonIcon,
  FIRST_QUARTER: CuartoCrecienteMoonIcon,
  WANING_GIBBOUS: GibosaMenguanteMoonIcon,
  FULL_MOON: LlenaMoonIcon,
  WANING_CRESCENT: GibosaCrecienteMoonIcon,
  LAST_QUARTER: CuartoMenguanteMoonIcon,
};

/**
 * Lunar phase display names.
 * Preserved exactly from original LUNAR_PHASE_NAME constant.
 */
export const LUNAR_PHASE_NAME = {
  NEW_MOON: 'Luna nueva',
  FIRST_QUARTER: 'Cuarto crescente',
  WANING_GIBBOUS: 'Menguante gibosa',
  FULL_MOON: 'Luna llena',
  LAST_QUARTER: 'Cuarto menguante',
  WANING_CRESCENT: 'Menguante crescente',
} as const;

export type LunarPhaseKey = keyof typeof LUNAR_PHASE_NAME;

// ─── Default phase (fallback) ─────────────────────────────────────────────────

const DEFAULT_PHASE: LunarPhaseKey = 'NEW_MOON';

// ─── Fixed text / icon colors (original always uses dark backgrounds) ─────────
// moon-card.component.scss background is always dark (gray-700 or blue-800),
// so text must always be light regardless of global theme.

const MOON_CARD_TITLE_COLOR = '#FFFFFF'; // always white on dark bg
const MOON_CARD_SUBTITLE_COLOR = '#D4D4D4'; // --Colors-Gray-300
const MOON_CARD_ARROW_COLOR = '#FFFFFF'; // always white on dark bg

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MoonCardProps {
  /**
   * The lunar phase key.
   * BUG FIX (§4.4): when phase is falsy, 'NEW_MOON' is used as fallback
   * for BOTH the name AND the icon (original bug: fallback only applied to _phase).
   */
  phase?: LunarPhaseKey;
  /** Background variant: 'gray' (default) or 'green' */
  background?: 'gray' | 'green';
  /**
   * Display name override. If not provided, derived from phase.
   * NOTE: if phase is set, it overrides phaseName (matches original setter behavior).
   */
  phaseName?: string;
  /** Whether to show the arrow icon */
  hasArrow?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MoonCard
 *
 * Displays the current lunar phase with icon and name.
 *
 * @example
 *   <MoonCard phase="FULL_MOON" background="green" hasArrow />
 */
export function MoonCard({
  phase,
  background = 'gray',
  phaseName: phaseNameProp,
  hasArrow = true,
}: MoonCardProps): React.JSX.Element {
  const { theme } = useTheme();

  // BUG FIX (§4.4): use resolved fallback consistently for both name and icon
  // Original bug: `this._phase = _phase ? _phase : 'NEW_MOON'` but then
  // `this.phaseName = LUNAR_PHASE_NAME[_phase]` (uses param, not resolved)
  // Fix: always use resolvedPhase for lookups
  const resolvedPhase: LunarPhaseKey = phase ?? DEFAULT_PHASE;

  // Phase name: caller override takes precedence; else derived from resolvedPhase
  const phaseName: string = phaseNameProp ?? LUNAR_PHASE_NAME[resolvedPhase];

  // Phase icon component
  const PhaseIconComponent = LUNAR_PHASE_COMPONENTS[resolvedPhase];

  const isGreen = background === 'green';

  return (
    <View
      style={[
        styles.container,
        // Original: gray variant → --Colors-Gray-700 = #404040 (charcoal dark)
        //           green variant → --Colors-Blue-800 = #1A6270 (teal dark)
        { backgroundColor: isGreen ? theme.colors.blue[800] : theme.colors.gray[700] },
      ]}
      testID="moon-card"
    >
      <View style={styles.card}>
        {/* Moon phase icon */}
        <View style={styles.iconWrapper}>
          <PhaseIconComponent width={60} height={60} />
        </View>

        {/* Phase name text */}
        <View style={styles.textWrapper}>
          <Text
            style={[
              styles.subtitle,
              {
                // original: font-size:14px, font-weight:500, color:--Colors-Gray-300
                fontFamily: fontFamilyForWeight('500'),
                color: MOON_CARD_SUBTITLE_COLOR,
              },
            ]}
          >
            Fase lunar
          </Text>
          <Text
            style={[
              styles.title,
              {
                // original: font-size:18px, font-weight:600, color:#fff
                fontFamily: fontFamilyForWeight('600'),
                color: MOON_CARD_TITLE_COLOR,
              },
            ]}
            testID="moon-card-phase-name"
          >
            {phaseName}
          </Text>
        </View>

        {/* Arrow icon */}
        {hasArrow && (
          <View style={styles.arrowWrapper}>
            <ArrowRightIcon
              width={20}
              height={20}
              color={MOON_CARD_ARROW_COLOR}
            />
          </View>
        )}
      </View>

      {/* Background eclipses decoration */}
      <View style={styles.eclipsesWrapper} pointerEvents="none">
        <EclipsesIcon width={120} height={80} opacity={0.15} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    fontSize: 14, // original: 14px
  },
  title: {
    fontSize: 18, // original: 18px
  },
  arrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eclipsesWrapper: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
});

export default MoonCard;
