/**
 * B08 — theme.ts: Single source of truth for all visual tokens.
 *
 * Ported from:
 *   - src/theme/variables.scss (two color systems unified here)
 *   - src/theme/mixins.scss (text_base → AppText component, margin separated)
 *   - src/global.scss (typography scale, spacing/radius fallbacks)
 *
 * Decisions (portability-matrix §4 / discovery/styling-theme.md):
 *
 * COLOR SYSTEMS UNIFIED (R-42):
 *   Two systems coexisted: `--ion-color-uva_*` (Ionic semantic) and `--Colors-*`
 *   (Tailwind-style palettes). Both are mapped here to a single JS object.
 *   IMPORTANT: `uva_green-700` (#14788A) is BLUE, not green — documented as alias.
 *   `--gray-900` (#111928) ≠ `--Colors-Gray-900` (#171717) — preserved as `gray900Alt`.
 *
 * SPACING / RADIUS FORMALIZED (R-42):
 *   Tokens `--xl`, `--3xl`, `--4xl`, `--White`, etc. were NEVER defined in SCSS;
 *   they resolved to inline fallback values. Formalized here as real constants.
 *
 * LIGHT THEME FORCED (R-51):
 *   Ionic's dark.system.css was imported but never implemented with own tokens.
 *   RN always uses this light theme (no dark mode).
 *
 * FONT FAMILIES (R-16):
 *   Variable fonts do NOT interpolate fontWeight reliably on Android RN.
 *   Static fonts (400/500/600/700, normal+italic) are registered as separate
 *   family names: 'Montserrat-Regular', 'Montserrat-Medium', etc.
 *   Use fontFamilyForWeight() to select the correct family by weight + style.
 *
 * SHADOWS (R-42):
 *   box-shadow web → elevation (Android) + shadow* props (iOS).
 *   Tinted shadows (blue/green from environmental report) are approximated.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

/**
 * Unified color palette.
 * Sources:
 *   - §1.1 `--ion-color-uva_*` (ionic semantic tokens)
 *   - §1.2 `--Colors-*` (design system palettes)
 *   - §1.3 documented inconsistencies
 */
export const colors = {
  /** Blue scale (--Colors-Blue-*). Also aligns with --ion-color-uva_blue-500/600. */
  blue: {
    50: '#EDFEFE',
    100: '#D1FBFC',
    200: '#A9F5F8',
    300: '#6EEBF2',
    400: '#2CD9E4',
    500: '#10BCCA', // = --ion-color-uva_blue-500
    600: '#1097AA', // = --ion-color-uva_blue-600
    700: '#14788A', // = --Colors-Blue-700 = --ion-color-uva_green-700 (NOTE: named "green" but is BLUE)
    800: '#1A6270',
    900: '#164551',
    950: '#0B3641',
  },
  /** Orange scale (--Colors-Orange-*). Also aligns with --ion-color-uva_orange-500. */
  orange: {
    50: '#FDF9EF',
    100: '#FBF0D9',
    200: '#F7DFB1',
    300: '#F1C880',
    400: '#EBA84C',
    500: '#E58B24', // = --ion-color-uva_orange-500
    600: '#D7751F',
    700: '#B25A1C',
    800: '#8E481E',
  },
  /** Green scale (--Colors-Green-*). Also aligns with --ion-color-uva_green-500. */
  green: {
    50: '#F2F9EC',
    100: '#E3F2D5',
    200: '#C8E6B0',
    300: '#A5D581',
    400: '#85C259',
    500: '#69AB3C', // = --ion-color-uva_green-500
    600: '#4E852B',
    700: '#3D6625',
    800: '#335222',
    900: '#2E4621',
    950: '#15260D',
  },
  /** Gray scale (--Colors-Gray-*). */
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  /** --Colors-Danger (#E5245E) */
  danger: '#E5245E',
  /**
   * --gray-900 (#111928) — different from gray.900 (#171717).
   * Both existed in variables.scss with almost identical values.
   * Preserved as separate token to avoid breaking callers.
   */
  gray900Alt: '#111928',
  /** Canonical white. Replaces undefined --White and --Linear-white base. */
  white: '#FFFFFF',
  /** Black */
  black: '#000000',
} as const;

export type Colors = typeof colors;

/**
 * Writable version of the Colors type — used by buildRuntimeTheme to allow
 * merging RACIMO branding overrides into the token tree at runtime without
 * mutating the `as const` base object.
 *
 * All nested scale objects become mutable string maps; scalar tokens are mutable strings.
 * This is the shape that `RuntimeTheme.colors` will carry.
 */
export type MutableColors = {
  blue:      Record<number, string>;
  orange:    Record<number, string>;
  green:     Record<number, string>;
  gray:      Record<number, string>;
  danger:    string;
  gray900Alt: string;
  white:     string;
  black:     string;
};

// ─── CSS-var-name → token path resolver ──────────────────────────────────────

/**
 * Applies a single RACIMO branding override (from colors.json) into a
 * mutable clone of the RN colors tree.
 *
 * Mapping rules (derived from src/theme/variables.scss):
 *
 *   CSS var key                      → RN token
 *   ─────────────────────────────────────────────
 *   Colors-Blue-{N}                  → colors.blue[N]
 *   Colors-Green-{N}                 → colors.green[N]
 *   Colors-Orange-{N}                → colors.orange[N]
 *   Colors-Gray-{N}                  → colors.gray[N]
 *   Colors-Danger                    → colors.danger
 *   ion-color-uva_blue-500           → colors.blue[500]
 *   ion-color-uva_blue-600           → colors.blue[600]
 *   ion-color-uva_green-500          → colors.green[500]
 *   ion-color-uva_green-700          → colors.blue[700]  (alias — documented in theme.ts)
 *   ion-color-uva_orange-500         → colors.orange[500]
 *
 * Keys that do not match any token are silently skipped (they still land in
 * brandingOverrides for RichText/varTokenResolver use).
 *
 * @param key   - colors.json key (same as CSS var name without '--')
 * @param value - resolved color string (HEX '#rrggbb' or 'rgb(r,g,b)')
 * @param target - mutable clone of the colors object to patch in-place
 */
export function applyOverrideToColors(
  key: string,
  value: string,
  target: MutableColors,
): void {
  // ── Colors-{Scale}-{N} ───────────────────────────────────────────────────
  const paletteMatch = key.match(/^Colors-([A-Za-z]+)-(\d+)$/);
  if (paletteMatch) {
    const scale = paletteMatch[1].toLowerCase();
    const step  = Number(paletteMatch[2]);
    if (scale === 'blue'   && scale in target) { (target.blue   as Record<number, string>)[step] = value; return; }
    if (scale === 'green'  && scale in target) { (target.green  as Record<number, string>)[step] = value; return; }
    if (scale === 'orange' && scale in target) { (target.orange as Record<number, string>)[step] = value; return; }
    if (scale === 'gray'   && scale in target) { (target.gray   as Record<number, string>)[step] = value; return; }
    return;
  }

  // ── Colors-Danger ────────────────────────────────────────────────────────
  if (key === 'Colors-Danger') {
    target.danger = value;
    return;
  }

  // ── ion-color-uva_* ──────────────────────────────────────────────────────
  const ionMatch = key.match(/^ion-color-uva_(blue|green|orange)-(\d+)$/);
  if (ionMatch) {
    const ionScale = ionMatch[1];
    const ionStep  = Number(ionMatch[2]);
    if (ionScale === 'blue')   { (target.blue   as Record<number, string>)[ionStep] = value; return; }
    if (ionScale === 'orange') { (target.orange as Record<number, string>)[ionStep] = value; return; }
    if (ionScale === 'green') {
      // Special case: uva_green-700 is actually blue (documented alias in theme.ts / R-42)
      if (ionStep === 700) { (target.blue as Record<number, string>)[700] = value; return; }
      (target.green as Record<number, string>)[ionStep] = value;
      return;
    }
  }
}

// ─── Semantic aliases (Ionic/Angular usage → RN usage) ───────────────────────

/**
 * Semantic color aliases that map the Ionic color names to our palette.
 * Used for quick reference by components that previously used `color="..."`.
 */
export const semanticColors = {
  primary: colors.blue[500],
  primaryDark: colors.blue[700],
  secondary: colors.green[500],
  accent: colors.orange[500],
  danger: colors.danger,
  /**
   * Default page background.
   * #F4F4F4 — hardcoded in home.page.scss (`ion-content { --background: #f4f4f4 }`)
   * and used as the most common content background in the Ionic app.
   * Note: --Colors-Gray-100 = #F5F5F5 (1 unit lighter) is used by some other pages;
   * this token reflects the dominant value (#f4f4f4) to match the Home screen.
   */
  background: '#F4F4F4' as string,
  surface: colors.white,
  text: colors.gray[900],
  textSecondary: colors.gray[600],
  border: colors.gray[200],
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

/**
 * Spacing scale in density-independent pixels.
 *
 * Formalizes the magic numbers that appeared as fallbacks for undefined tokens
 * like `var(--xl, 10px)`, `var(--2xl)`, `var(--4xl, 16px)` in SCSS.
 *
 * All px values → unitless numbers (RN convention).
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 10,   // was `var(--xl, 10px)` used as margin/padding
  lg: 16,   // was `var(--4xl, 16px)` used as radius/padding
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export type Spacing = typeof spacing;

// ─── Border radius ────────────────────────────────────────────────────────────

/**
 * Border radius scale in density-independent pixels.
 *
 * Formalizes the undefined tokens:
 *   --xl → 10px (used as radius in home, global)
 *   --3xl → 14px (used in progress-bar, global)
 *   --4xl → 16px (used as radius/padding in global)
 */
export const radius = {
  sm: 6,
  md: 8,
  xl: 10,   // was `var(--xl, 10px)`
  '3xl': 14,  // was `var(--3xl, 14px)`
  '4xl': 16,  // was `var(--4xl, 16px)`
  pill: 18,
  round: 9999, // border-radius: 50% equivalent for View
} as const;

export type Radius = typeof radius;

// ─── Typography ──────────────────────────────────────────────────────────────

/**
 * Typography scale.
 *
 * font-size scale derived from global.scss / components (§2.3 of styling-theme.md).
 * Weights map to static font families (see fontFamilyForWeight).
 * line-height: 'normal' in CSS ≈ 1.2–1.4 × fontSize; use lineHeightFor() to compute.
 */
export const typography = {
  /**
   * Base family name prefix. Actual family = `Montserrat-${variant}`.
   * Do NOT use this directly as fontFamily in StyleSheet — use fontFamilyForWeight().
   */
  fontFamilyBase: 'Montserrat',

  /**
   * Font size scale in density-independent pixels.
   * Source: §2.3 styling-theme.md, global.scss, component SCSS files.
   */
  sizes: {
    xs: 12,    // .text-xs, paragraph
    sm: 14,    // labels, subtítulos, header
    base: 16,  // default text/buttons/inputs
    lg: 18,    // card titles, headers, moon-card
    xl: 20,    // h1/h2, .text-xl
    xxl: 22,   // .text-xxl
    title: 24, // report-title
    brand: 28, // .app-name brand
    modal: 30, // modal_token h1
  },

  /**
   * Weight tokens mapped to expo-font family suffixes.
   * Use with fontFamilyForWeight() to get the correct fontFamily string.
   */
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export type Typography = typeof typography;

/**
 * Returns the expo-font family name for a given weight and style.
 *
 * Android RN does NOT interpolate fontWeight from a variable font.
 * Each weight is a SEPARATE font file registered as a distinct family.
 *
 * @param weight - one of '400' | '500' | '600' | '700'
 * @param italic - whether to use the italic variant
 * @returns font family string for use in `fontFamily` style prop
 *
 * @example
 *   { fontFamily: fontFamilyForWeight('600') }          // Montserrat-SemiBold
 *   { fontFamily: fontFamilyForWeight('700', true) }    // Montserrat-BoldItalic
 */
export function fontFamilyForWeight(
  weight: '400' | '500' | '600' | '700',
  italic = false,
): string {
  const map: Record<string, string> = {
    '400': italic ? 'Montserrat-Italic' : 'Montserrat-Regular',
    '500': italic ? 'Montserrat-MediumItalic' : 'Montserrat-Medium',
    '600': italic ? 'Montserrat-SemiBoldItalic' : 'Montserrat-SemiBold',
    '700': italic ? 'Montserrat-BoldItalic' : 'Montserrat-Bold',
  };
  return map[weight] ?? 'Montserrat-Regular';
}

/**
 * Computes a lineHeight number from a fontSize.
 * CSS `line-height: 150%` → fontSize * 1.5.
 * CSS `line-height: normal` → fontSize * 1.2 (approximation, matches most native defaults).
 *
 * @param fontSize - font size in density-independent pixels
 * @param ratio - multiplier (default 1.2 for 'normal', use 1.5 for '150%')
 */
export function lineHeightFor(fontSize: number, ratio = 1.2): number {
  return Math.round(fontSize * ratio);
}

// ─── Shadows ─────────────────────────────────────────────────────────────────

/**
 * Shadow tokens.
 *
 * box-shadow → elevation (Android) + shadow* (iOS).
 * Tinted shadows (blue/green) cannot be replicated with elevation alone on Android.
 * Approximated with grayish shadow + documented in deviations.
 *
 * Sources: §4.3 styling-theme.md
 *   sm  → box-shadow: 0 1px 3px rgba(0,0,0,0.1)     elevation ~2
 *   md  → box-shadow: 0 2px 8px rgba(0,0,0,0.15)    elevation ~4
 *   lg  → box-shadow: 0 4px 12-16px rgba(0,0,0,0.2) elevation ~8
 */
export const shadows = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  md: {
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  lg: {
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  /** Tinted blue shadow (alert.component, environmental-report). Android: elevation only (no tint). */
  blueTint: {
    elevation: 4,
    shadowColor: colors.blue[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  /** Tinted green shadow (environmental-report). Android: elevation only (no tint). */
  greenTint: {
    elevation: 4,
    shadowColor: colors.green[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
} as const;

export type Shadows = typeof shadows;

// ─── Font map for expo-font useFonts() ───────────────────────────────────────

/**
 * Font map for use with `useFonts()` from expo-font.
 *
 * Each key is the font family name used in styles.
 * Each value is a require() path to the static TTF file.
 *
 * Source files: mobile/assets/fonts/Montserrat-*.ttf
 * Generated by: fonttools varLib.instancer from the original variable fonts
 * (src/assets/fonts/Montserrat/Montserrat-VariableFont_wght.ttf and
 *  Montserrat-Italic-VariableFont_wght.ttf)
 * Weights extracted: 400, 500, 600, 700 (normal + italic each).
 *
 * WHY static fonts: Android RN does not reliably interpolate fontWeight
 * from a variable font (R-16). Each weight is a separate family.
 */
export const MONTSERRAT_FONTS = {
  'Montserrat-Regular':         require('../../assets/fonts/Montserrat-Regular.ttf'),
  'Montserrat-Medium':          require('../../assets/fonts/Montserrat-Medium.ttf'),
  'Montserrat-SemiBold':        require('../../assets/fonts/Montserrat-SemiBold.ttf'),
  'Montserrat-Bold':            require('../../assets/fonts/Montserrat-Bold.ttf'),
  'Montserrat-Italic':          require('../../assets/fonts/Montserrat-Italic.ttf'),
  'Montserrat-MediumItalic':    require('../../assets/fonts/Montserrat-MediumItalic.ttf'),
  'Montserrat-SemiBoldItalic':  require('../../assets/fonts/Montserrat-SemiBoldItalic.ttf'),
  'Montserrat-BoldItalic':      require('../../assets/fonts/Montserrat-BoldItalic.ttf'),
} as const;

// ─── Theme object (runtime base — overridable by RACIMO branding) ─────────────

/**
 * Base theme object.
 *
 * This is the compile-time base. At runtime, ThemeProvider merges
 * RACIMO branding overrides from colors.json (via ConfigContext) on top of this.
 *
 * Forced light theme (R-51): no dark mode tokens.
 */
export const baseTheme = {
  colors,
  semanticColors,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export type BaseTheme = typeof baseTheme;

/**
 * Runtime theme shape — extends the base with the merged RACIMO overrides.
 *
 * `colors` is widened to `MutableColors` so the runtime theme can carry a
 * patched palette without violating the `as const` constraint of baseTheme.
 * All other tokens are inherited unchanged from BaseTheme.
 *
 * `brandingOverrides` stores the raw colors.json keys for use by components
 * that resolve CSS var names directly (e.g. varTokenResolver / RichText).
 */
export interface RuntimeTheme extends Omit<BaseTheme, 'colors'> {
  /** Merged color palette: base tokens + RACIMO branding overrides applied. */
  colors: MutableColors;
  /** Flat overrides from colors.json keyed by CSS-var-derived name. */
  brandingOverrides: Record<string, string>;
}
