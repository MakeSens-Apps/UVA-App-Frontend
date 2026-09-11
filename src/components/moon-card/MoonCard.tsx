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
import { View, Text, StyleSheet, Image } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Moon phase SVG icons ─────────────────────────────────────────────────────

import Svg, { Path } from 'react-native-svg';
// EclipsesIcon is a proper vector SVG (no xlink:href) — can be used with react-native-svg
import EclipsesIcon from '@/assets/svg/moon/eclipses_card_home.svg';

// Moon phase SVGs use xlink:href pattern with embedded bitmaps which react-native-svg
// cannot render. Use extracted PNG assets instead. (Divergence 13 — audit-round1)
const MOON_PHASE_IMAGES: Record<string, number> = {
  NEW_MOON: require('@/assets/png/moon/nueva.png') as number,
  FULL_MOON: require('@/assets/png/moon/llena.png') as number,
  FIRST_QUARTER: require('@/assets/png/moon/cuarto_creciente.png') as number,
  LAST_QUARTER: require('@/assets/png/moon/cuarto_menguante.png') as number,
  WANING_GIBBOUS: require('@/assets/png/moon/gibosa_menguante.png') as number,
  WANING_CRESCENT: require('@/assets/png/moon/gibosa_creciente.png') as number,
};

// Same arrow path as assets/svg/icons/arrow-right.svg, but drawn inline so the
// color can be WHITE: the asset hardcodes fill/stroke #10BCCA (teal, used by the
// Header), while the original moon-card sets `ion-icon { color: white }`.
const ARROW_RIGHT_PATH =
  'M10.3349 4.13964L14.1985 8.00329L15.0521 8.85684H13.845H3.41758C3.31149 8.85684 3.20975 8.89898 3.13474 8.974C3.05972 9.04901 3.01758 9.15075 3.01758 9.25684C3.01758 9.36293 3.05972 9.46467 3.13474 9.53968C3.20975 9.6147 3.31149 9.65684 3.41758 9.65684H13.845H15.0521L14.1985 10.5104L10.3385 14.3704C10.2672 14.4456 10.2278 14.5455 10.2287 14.6493C10.2296 14.7541 10.2716 14.8545 10.3458 14.9286C10.42 15.0028 10.5203 15.0449 10.6252 15.0458C10.7289 15.0467 10.8288 15.0073 10.904 14.9359L16.3003 9.53964C16.3003 9.53962 16.3003 9.5396 16.3003 9.53959C16.3753 9.46458 16.4174 9.36288 16.4174 9.25684C16.4174 9.1508 16.3753 9.0491 16.3003 8.97409L10.3349 4.13964ZM10.3349 4.13964C10.3349 4.13962 10.3348 4.1396 10.3348 4.13959M10.3349 4.13964L10.3348 4.13959M10.3348 3.57415C10.3348 3.57411 10.3348 3.57407 10.3349 3.57404C10.4099 3.49912 10.5116 3.45703 10.6176 3.45703C10.7236 3.45703 10.8253 3.49914 10.9003 3.57409C10.9003 3.57411 10.9004 3.57413 10.9004 3.57415L16.3003 8.97404L10.3348 3.57415ZM10.3348 3.57415C10.2599 3.64915 10.2178 3.75082 10.2178 3.85684C10.2178 3.96288 10.2599 4.06458 10.3348 4.13959M10.3348 3.57415L10.3348 4.13959';

// ─── Constants (preserved from original) ──────────────────────────────────────

// Moon phase images resolved from MOON_PHASE_IMAGES map (PNG per phase)

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

// Intrinsic size of assets/svg/moon/eclipses_card_home.svg (340 x 88).
const ECLIPSES_ASPECT_RATIO = 340 / 88;

const MOON_CARD_TITLE_COLOR = '#FFFFFF'; // always white on dark bg
const MOON_CARD_SUBTITLE_COLOR = '#D4D4D4'; // --Colors-Gray-300
const MOON_CARD_ARROW_COLOR = '#FFFFFF'; // always white on dark bg

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MoonCardProps {
  /**
   * The lunar phase key.
   * BUG FIX (§4.4): when phase is `undefined`, 'NEW_MOON' is used as fallback
   * for BOTH the name AND the icon (original bug: fallback only applied to _phase).
   *
   * `null` means "not resolved yet" and is NOT the same as `undefined`: the card renders
   * a neutral placeholder (no moon image, no phase name) instead of committing to a
   * phase the screen has not loaded. Screens seeded their state with a hard-coded phase
   * and showed it for ~2s on every entry to Home before the real one arrived (D-08 /
   * D-11 / D-13 "flash Luna llena"); they now seed with `null`.
   */
  phase?: LunarPhaseKey | null;
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

  // `phase === null` → still loading: render the card chrome with a neutral disc and no
  // phase name, so the user never sees a wrong phase flash before the real one lands.
  const isPending = phase === null;

  // BUG FIX (§4.4): use resolved fallback consistently for both name and icon
  // Original bug: `this._phase = _phase ? _phase : 'NEW_MOON'` but then
  // `this.phaseName = LUNAR_PHASE_NAME[_phase]` (uses param, not resolved)
  // Fix: always use resolvedPhase for lookups
  const resolvedPhase: LunarPhaseKey = phase ?? DEFAULT_PHASE;

  // Phase name: caller override takes precedence; else derived from resolvedPhase
  const phaseName: string = isPending
    ? ''
    : (phaseNameProp ?? LUNAR_PHASE_NAME[resolvedPhase]);

  // Moon phase image source (PNG — SVGs have xlink:href that react-native-svg cannot render)
  const moonPhaseImage = MOON_PHASE_IMAGES[resolvedPhase];

  const isGreen = background === 'green';

  return (
    <View
      style={[
        styles.container,
        // Original: gray variant → --Colors-Gray-700 = #404040 (charcoal dark)
        //           green variant → --Colors-Blue-800 = #1A6270 (teal dark)
        {
          backgroundColor: isGreen
            ? theme.colors.blue[800]
            : theme.colors.gray[700],
        },
      ]}
      testID="moon-card"
    >
      <View style={styles.card}>
        {/* Moon phase icon */}
        <View style={styles.iconWrapper}>
          {isPending ? (
            // Neutral placeholder — same footprint as the real image so nothing jumps
            // when the phase resolves (D-08 / D-11 / D-13).
            <View
              style={styles.moonPlaceholder}
              testID="moon-card-placeholder"
            />
          ) : (
            /* Moon phase PNG image (circular, 55px — original ion-img) */
            <Image
              source={moonPhaseImage}
              style={styles.moonImage}
              resizeMode="cover"
            />
          )}
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

        {/* Arrow icon — original: ion-icon arrow-forward, color WHITE */}
        {hasArrow && (
          <View style={styles.arrowWrapper}>
            <Svg width={20} height={20} viewBox="0 0 19 19" fill="none">
              <Path
                d={ARROW_RIGHT_PATH}
                fill={MOON_CARD_ARROW_COLOR}
                stroke={MOON_CARD_ARROW_COLOR}
              />
            </Svg>
          </View>
        )}
      </View>

      {/* Stars decoration over the dark background.
          Original: moon-card.component.html ion-img.eclipses
          (assets/images/Moon/eclipses_card_home .svg — white star dots, 340x88)
          + .scss .eclipses { position:absolute; top:0; height:100%; margin-inline:16px }
          Rendered at full opacity covering the whole card (see
          docs/evidence/home/screen-09-moon-card.png).
          BUG FIX: pointerEvents in style (not prop) ensures CSS pointer-events:none on
          web (react-native-web) so the overlay does NOT intercept TouchableOpacity taps. */}
      <View style={styles.eclipsesWrapper}>
        <EclipsesIcon
          width="100%"
          height="100%"
          preserveAspectRatio="xMinYMid meet"
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // Original: moon-card.component.scss .card_moon { border-radius: 16px; margin-inline: 10px }
    // + .card_moon_container { margin-block: 10px }
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 10,
    marginVertical: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconWrapper: {
    // Original: .card_moon .moon { width: 56px; height: 56px }
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Moon phase PNG (circular; matches original ion-img with rx=43 SVG clip)
  moonImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  // Same 56px disc, neutral fill, shown only while the phase is still loading.
  moonPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  textWrapper: {
    // Original: .card_text { gap: 10px }
    flex: 1,
    gap: 10,
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
    // Original: .eclipses — absolute, top 0, height 100%, margin-inline 16px, and
    // `width: auto`, so the 340x88 artwork scales by HEIGHT and is anchored at its LEFT
    // edge (16px from the container = 6px inside the card, which carries margin-inline 10).
    // The previous `left/right: 6` + `xMidYMid slice` CENTRED the artwork instead: as soon
    // as the scaled width exceeded the card, every star drifted left and the 2px star at
    // x=117 landed on top of the "Fase lunar" label (D-11). Pinning left + aspectRatio
    // reproduces the original geometry.
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 6,
    aspectRatio: ECLIPSES_ASPECT_RATIO,
    // BUG FIX: pointer-events:none in style (not prop) so react-native-web
    // correctly applies the CSS property and the overlay never intercepts taps.
    pointerEvents: 'none',
  },
});

export default MoonCard;
