/**
 * B08 — ThemeProvider / useTheme()
 *
 * Ported from: src/app/core/services/storage/configuration-app.service.ts Part 2
 *              (the applyColors() / CSS var setProperty portion)
 *
 * Replaces: document.documentElement.style.setProperty('--'+key, value)
 * With:     React Context hydrated from ConfigContext.configColors (R-05)
 *
 * Design:
 *  - ThemeProvider wraps the app tree INSIDE the ConfigProvider (B06).
 *  - It watches configColors from ConfigContext and merges branding overrides
 *    on top of the baseTheme whenever colors.json changes.
 *  - useTheme() returns the current RuntimeTheme (tokens + branding).
 *  - Fonts are loaded here via useFonts() (expo-font, R-16).
 *  - Theme is always light (R-51 — no dark mode tokens).
 *
 * ColorsModel contract (preserved from original):
 *  - HEX: { value: '#rrggbb', group: string, type: 'HEX' }
 *  - RGB: { value: [r, g, b], group: string, type: 'RGB' }
 *  Each key becomes a branding override slot (analogous to the CSS var name).
 *
 * Portability matrix: "storage/configuration-app.service.ts" Part 2 → ThemeProvider
 * Risks: R-05, R-16, R-42, R-51
 */

import React, {
  createContext,
  useContext,
  useMemo,
} from 'react';
import { useFonts } from 'expo-font';

import type { ColorsModel } from '@/data/models/configuration/colors.model';
import { useConfigContext } from '@/state/ConfigContext';
import {
  baseTheme,
  applyOverrideToColors,
  MONTSERRAT_FONTS,
  type MutableColors,
  type RuntimeTheme,
} from '@/theme/theme';

// ─── Context ──────────────────────────────────────────────────────────────────

export interface ThemeContextValue {
  /** The current runtime theme (base + RACIMO branding merged). */
  theme: RuntimeTheme;
  /**
   * True once expo-font has finished loading all Montserrat static weights.
   * While false, screens should show a loading state or use system font.
   */
  fontsLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Color resolution (mirrors original applyColors) ─────────────────────────

/**
 * Converts a ColorsModel (from colors.json) to a flat Record<string, string>
 * that maps each key to a CSS-compatible color string.
 *
 * Mirrors the original applyColors() logic:
 *   - HEX: value is already '#rrggbb' → use as-is
 *   - RGB: value is [r, g, b] → convert to 'rgb(r, g, b)'
 *
 * Reference: configuration-app.service.ts:273-285
 */
function colorsModelToOverrides(model: ColorsModel): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, data] of Object.entries(model)) {
    if (data.type === 'HEX') {
      result[key] = data.value as string;
    } else if (data.type === 'RGB') {
      const [r, g, b] = data.value as [number, number, number];
      result[key] = `rgb(${r}, ${g}, ${b})`;
    }
  }
  return result;
}

/**
 * Builds the RuntimeTheme by merging RACIMO branding overrides INTO the token tree.
 *
 * Deep-clones baseTheme.colors into a MutableColors object, then applies every
 * override whose CSS-var key maps to a known token path (via applyOverrideToColors).
 * Screens that read `theme.colors.blue[500]` etc. will therefore see the RACIMO
 * color without any code changes on their side.
 *
 * `brandingOverrides` is also preserved as-is for varTokenResolver / RichText,
 * which resolve CSS-var names directly.
 *
 * Reference: configuration-app.service.ts:273-285 (applyColors → setProperty).
 */
function buildRuntimeTheme(overrides: Record<string, string>): RuntimeTheme {
  // Deep-clone the base color scales into mutable nested objects so the
  // `as const` base is never mutated.
  const mergedColors: MutableColors = {
    blue:      { ...baseTheme.colors.blue },
    orange:    { ...baseTheme.colors.orange },
    green:     { ...baseTheme.colors.green },
    gray:      { ...baseTheme.colors.gray },
    danger:    baseTheme.colors.danger,
    gray900Alt: baseTheme.colors.gray900Alt,
    white:     baseTheme.colors.white,
    black:     baseTheme.colors.black,
  };

  // Apply each RACIMO override to the matching token slot.
  for (const [key, value] of Object.entries(overrides)) {
    applyOverrideToColors(key, value, mergedColors);
  }

  return {
    ...baseTheme,
    colors: mergedColors,
    brandingOverrides: overrides,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider
 *
 * Must be placed INSIDE ConfigProvider so it can read configColors from ConfigContext.
 *
 * On mount, reads the current configColors (which ConfigContext may have already loaded).
 * On every configColors change (e.g. RACIMO switch), rebuilds the RuntimeTheme.
 *
 * Fonts (Montserrat static 400/500/600/700 normal+italic) are loaded once here.
 */
export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const { configColors } = useConfigContext();

  // ─── Load fonts (R-16) ──────────────────────────────────────────────────
  const [fontsLoaded] = useFonts(MONTSERRAT_FONTS);

  // ─── Derive branding overrides directly from configColors ───────────────
  // Using useMemo instead of useState+useEffect avoids cascading renders
  // (react-hooks/set-state-in-effect lint rule).
  // configColors comes from ConfigContext state, so this is purely derived.
  const brandingOverrides = useMemo<Record<string, string>>(
    () => (configColors !== null ? colorsModelToOverrides(configColors) : {}),
    [configColors],
  );

  const theme = useMemo(
    () => buildRuntimeTheme(brandingOverrides),
    [brandingOverrides],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, fontsLoaded }),
    [theme, fontsLoaded],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useTheme()
 *
 * Returns the current RuntimeTheme and fontsLoaded flag.
 * Must be called within a <ThemeProvider>.
 *
 * @example
 *   const { theme, fontsLoaded } = useTheme();
 *   const titleStyle = {
 *     fontFamily: fontFamilyForWeight('700'),
 *     fontSize: theme.typography.sizes.lg,
 *     color: theme.semanticColors.primary,
 *   };
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}

export default ThemeContext;
